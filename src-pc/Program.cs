using System;
using System.Diagnostics;
using System.IO;
using System.Net;
using System.Net.Sockets;
using System.Reflection;
using System.Text;
using System.Threading;
using System.Windows.Forms;

[assembly: AssemblyTitle("Cyber Beat Hopper")]
[assembly: AssemblyProduct("Cyber Beat Hopper")]
[assembly: AssemblyDescription("Cyber Beat Hopper - 3D Cyberpunk Rhythm Game")]
[assembly: AssemblyCompany("MeoTN Gaming")]
[assembly: AssemblyVersion("1.0.10.0")]
[assembly: AssemblyFileVersion("1.0.10.0")]
[assembly: AssemblyInformationalVersion("1.0.10")]
[assembly: AssemblyCopyright("Copyright © 2026 MeoTN Gaming")]

namespace CyberBeatHopper
{
    static class Program
    {
        private static TcpListener tcpListener;
        private static Thread serverThread;
        private static volatile bool isRunning = true;
        private static string webRoot;
        private static int port;
        private static long lastActivityTicks = 0;
        private static bool hasReceivedFirstRequest = false;

        [STAThread]
        static void Main(string[] args)
        {
            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);

            // 1. Locate web assets: priority www/ then current directory
            string exeDir = AppDomain.CurrentDomain.BaseDirectory;
            if (Directory.Exists(Path.Combine(exeDir, "www")))
            {
                webRoot = Path.Combine(exeDir, "www");
            }
            else if (Directory.Exists(Path.Combine(exeDir, "..", "www")))
            {
                webRoot = Path.GetFullPath(Path.Combine(exeDir, "..", "www"));
            }
            else if (File.Exists(Path.Combine(exeDir, "index.html")))
            {
                webRoot = exeDir;
            }
            else
            {
                MessageBox.Show(
                    "Cannot find game assets (index.html or www directory).\nPlease make sure 'www' or 'index.html' is in the game folder.",
                    "Cyber Beat Hopper - Error",
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Error
                );
                return;
            }

            // 2. Start pure Winsock TcpListener on deterministic static port (Preserves LocalStorage/IndexedDB origin across updates)
            try
            {
                int preferredPort = 38281;
                bool bound = false;
                for (int p = preferredPort; p < preferredPort + 10; p++)
                {
                    try
                    {
                        tcpListener = new TcpListener(IPAddress.Loopback, p);
                        tcpListener.Start();
                        port = p;
                        bound = true;
                        break;
                    }
                    catch (SocketException) { }
                }

                if (!bound)
                {
                    tcpListener = new TcpListener(IPAddress.Loopback, 0);
                    tcpListener.Start();
                    port = ((IPEndPoint)tcpListener.LocalEndpoint).Port;
                }

                lastActivityTicks = DateTime.UtcNow.Ticks;

                serverThread = new Thread(ServerLoop);
                serverThread.IsBackground = true;
                serverThread.Start();
            }
            catch (Exception ex)
            {
                MessageBox.Show(
                    "Failed to start local game server: " + ex.Message,
                    "Cyber Beat Hopper - Server Error",
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Error
                );
                return;
            }

            // 3. Find browser engine (Edge, WebView2, or Chrome)
            string browserPath = FindBrowser();
            string gameUrl = "http://127.0.0.1:" + port + "/index.html?app=standalone";

            if (!string.IsNullOrEmpty(browserPath))
            {
                // Permanent, dedicated game profile directory (safe from Windows Disk Cleanup)
                string profileDir = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "CyberBeatHopper", "UserData");
                string launchArgs = string.Format(
                    "--app=\"{0}\" --window-size=1280,720 --user-data-dir=\"{1}\" " +
                    "--no-first-run --no-default-browser-check " +
                    "--disable-features=Translate,InterestFeedContentSuggestions " +
                    "--enable-features=OverlayScrollbar,AudioWorkletRealtimeThread " +
                    "--enable-gpu-rasterization --enable-smooth-scrolling --disable-background-timer-throttling --disable-renderer-backgrounding",
                    gameUrl, profileDir
                );

                ProcessStartInfo psi = new ProcessStartInfo
                {
                    FileName = browserPath,
                    Arguments = launchArgs,
                    UseShellExecute = false
                };

                try
                {
                    DateTime launchTime = DateTime.UtcNow;
                    Process proc = Process.Start(psi);
                    if (proc != null)
                    {
                        proc.WaitForExit();
                        
                        // If process exited immediately (launcher delegation), keep server alive while window/heartbeat is active
                        double runSeconds = (DateTime.UtcNow - launchTime).TotalSeconds;
                        if (runSeconds < 2.0)
                        {
                            MonitorWindowOrHeartbeat();
                        }
                    }
                }
                catch (Exception)
                {
                    Process.Start(gameUrl);
                    MonitorWindowOrHeartbeat();
                }
            }
            else
            {
                // Fallback to default browser
                Process.Start(gameUrl);
                MonitorWindowOrHeartbeat();
            }

            isRunning = false;
            try
            {
                if (tcpListener != null) tcpListener.Stop();
            }
            catch { }
        }

        private static void MonitorWindowOrHeartbeat()
        {
            // Wait up to 30s for the game to start and make its first request
            int waitStartupCount = 0;
            while (isRunning && !hasReceivedFirstRequest && waitStartupCount < 60)
            {
                Thread.Sleep(500);
                waitStartupCount++;
            }

            // Once started, monitor heartbeats. If no activity for 8 seconds, exit cleanly.
            while (isRunning)
            {
                Thread.Sleep(1500);

                // Check if any msedge window with game title exists
                bool windowFound = IsEdgeGameWindowOpen();
                if (windowFound)
                {
                    Interlocked.Exchange(ref lastActivityTicks, DateTime.UtcNow.Ticks);
                    continue;
                }

                long diffTicks = DateTime.UtcNow.Ticks - Interlocked.Read(ref lastActivityTicks);
                double idleSeconds = (double)diffTicks / 10000000.0;
                if (idleSeconds > 8.0)
                {
                    break;
                }
            }
        }

        private static bool IsEdgeGameWindowOpen()
        {
            try
            {
                Process[] procs = Process.GetProcessesByName("msedge");
                foreach (Process p in procs)
                {
                    try
                    {
                        if (!p.HasExited && !string.IsNullOrEmpty(p.MainWindowTitle))
                        {
                            string title = p.MainWindowTitle.ToLowerInvariant();
                            if (title.Contains("cyber beat hopper") || title.Contains("127.0.0.1:" + port))
                            {
                                return true;
                            }
                        }
                    }
                    catch { }
                }
            }
            catch { }
            return false;
        }

        private static int GetFreeTcpPort()
        {
            TcpListener l = new TcpListener(IPAddress.Loopback, 0);
            l.Start();
            int p = ((IPEndPoint)l.LocalEndpoint).Port;
            l.Stop();
            return p;
        }

        private static string FindBrowser()
        {
            string[] candidates = new string[]
            {
                Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFilesX86), "Microsoft\\Edge\\Application\\msedge.exe"),
                Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles), "Microsoft\\Edge\\Application\\msedge.exe"),
                Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "Microsoft\\Edge\\Application\\msedge.exe"),
                Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles), "Google\\Chrome\\Application\\chrome.exe"),
                Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFilesX86), "Google\\Chrome\\Application\\chrome.exe"),
                Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "Google\\Chrome\\Application\\chrome.exe")
            };

            foreach (string path in candidates)
            {
                if (File.Exists(path)) return path;
            }
            return null;
        }

        private static void ServerLoop()
        {
            while (isRunning)
            {
                try
                {
                    TcpClient client = tcpListener.AcceptTcpClient();
                    ThreadPool.QueueUserWorkItem(HandleClient, client);
                }
                catch
                {
                    if (!isRunning) break;
                }
            }
        }

        private static void HandleClient(object state)
        {
            TcpClient client = (TcpClient)state;
            try
            {
                client.NoDelay = true;
                client.SendBufferSize = 64 * 1024;
                client.ReceiveBufferSize = 16 * 1024;
                using (NetworkStream stream = client.GetStream())
                {
                    stream.ReadTimeout = 4000;
                    byte[] buffer = new byte[8192];
                    int bytesRead = stream.Read(buffer, 0, buffer.Length);
                    if (bytesRead <= 0) return;

                    string request = Encoding.UTF8.GetString(buffer, 0, bytesRead);
                    string[] lines = request.Split(new string[] { "\r\n" }, StringSplitOptions.None);
                    if (lines.Length == 0) return;

                    string[] reqParts = lines[0].Split(' ');
                    if (reqParts.Length < 2) return;

                    string method = reqParts[0].ToUpperInvariant();
                    string rawUrl = reqParts[1];

                    hasReceivedFirstRequest = true;
                    Interlocked.Exchange(ref lastActivityTicks, DateTime.UtcNow.Ticks);

                    // Preflight CORS request
                    if (method == "OPTIONS")
                    {
                        string corsResponse = "HTTP/1.1 200 OK\r\n" +
                            "Access-Control-Allow-Origin: *\r\n" +
                            "Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS\r\n" +
                            "Access-Control-Allow-Headers: *\r\n" +
                            "Content-Length: 0\r\n\r\n";
                        byte[] corsBytes = Encoding.UTF8.GetBytes(corsResponse);
                        stream.Write(corsBytes, 0, corsBytes.Length);
                        return;
                    }

                    // Heartbeat ping from desktop-app.js
                    if (rawUrl.StartsWith("/heartbeat"))
                    {
                        byte[] hb = Encoding.UTF8.GetBytes("HTTP/1.1 200 OK\r\nContent-Type: text/plain\r\nContent-Length: 2\r\nAccess-Control-Allow-Origin: *\r\n\r\nOK");
                        stream.Write(hb, 0, hb.Length);
                        return;
                    }

                    // Clean URL (remove query and hash)
                    string cleanPath = rawUrl.Split('?')[0].Split('#')[0];
                    if (string.IsNullOrEmpty(cleanPath) || cleanPath == "/")
                    {
                        cleanPath = "/index.html";
                    }

                    string decodedPath = Uri.UnescapeDataString(cleanPath.TrimStart('/'));
                    string safePath = Path.GetFullPath(Path.Combine(webRoot, decodedPath.Replace('/', Path.DirectorySeparatorChar)));

                    // Path traversal protection
                    if (!safePath.StartsWith(webRoot, StringComparison.OrdinalIgnoreCase))
                    {
                        byte[] forbidden = Encoding.UTF8.GetBytes("HTTP/1.1 403 Forbidden\r\nContent-Length: 0\r\n\r\n");
                        stream.Write(forbidden, 0, forbidden.Length);
                        return;
                    }

                    if (!File.Exists(safePath))
                    {
                        byte[] notFound = Encoding.UTF8.GetBytes("HTTP/1.1 404 Not Found\r\nContent-Type: text/plain\r\nContent-Length: 13\r\n\r\n404 Not Found");
                        stream.Write(notFound, 0, notFound.Length);
                        return;
                    }

                    FileInfo fi = new FileInfo(safePath);
                    long totalLength = fi.Length;
                    string ext = Path.GetExtension(safePath).ToLowerInvariant();
                    string mime = GetMimeType(ext);

                    // Check for HTTP Range header
                    long start = 0;
                    long end = totalLength - 1;
                    bool isRange = false;

                    foreach (string line in lines)
                    {
                        if (line.StartsWith("Range: bytes=", StringComparison.OrdinalIgnoreCase))
                        {
                            string rangeVal = line.Substring(13).Trim();
                            string[] rparts = rangeVal.Split('-');
                            if (!string.IsNullOrEmpty(rparts[0])) long.TryParse(rparts[0], out start);
                            if (rparts.Length > 1 && !string.IsNullOrEmpty(rparts[1])) long.TryParse(rparts[1], out end);
                            if (end >= totalLength) end = totalLength - 1;
                            isRange = true;
                            break;
                        }
                    }

                    if (isRange)
                    {
                        long rangeLength = end - start + 1;
                        string header = string.Format(
                            "HTTP/1.1 206 Partial Content\r\n" +
                            "Content-Type: {0}\r\n" +
                            "Content-Range: bytes {1}-{2}/{3}\r\n" +
                            "Content-Length: {4}\r\n" +
                            "Access-Control-Allow-Origin: *\r\n" +
                            "Accept-Ranges: bytes\r\n" +
                            "Cache-Control: " + ((ext == ".html" || ext == ".js" || ext == ".css" || ext == ".json") ? "no-store, no-cache, must-revalidate\r\n\r\n" : "public, max-age=86400\r\n\r\n"),
                            mime, start, end, totalLength, rangeLength
                        );
                        byte[] hBytes = Encoding.UTF8.GetBytes(header);
                        stream.Write(hBytes, 0, hBytes.Length);

                        using (FileStream fs = new FileStream(safePath, FileMode.Open, FileAccess.Read, FileShare.Read))
                        {
                            fs.Seek(start, SeekOrigin.Begin);
                            byte[] chunk = new byte[64 * 1024];
                            long remaining = rangeLength;
                            while (remaining > 0)
                            {
                                int read = fs.Read(chunk, 0, (int)Math.Min(chunk.Length, remaining));
                                if (read <= 0) break;
                                stream.Write(chunk, 0, read);
                                remaining -= read;
                            }
                        }
                    }
                    else
                    {
                        string header = string.Format(
                            "HTTP/1.1 200 OK\r\n" +
                            "Content-Type: {0}\r\n" +
                            "Content-Length: {1}\r\n" +
                            "Access-Control-Allow-Origin: *\r\n" +
                            "Accept-Ranges: bytes\r\n" +
                            "Cache-Control: " + ((ext == ".html" || ext == ".js" || ext == ".css" || ext == ".json") ? "no-store, no-cache, must-revalidate\r\n\r\n" : "public, max-age=86400\r\n\r\n"),
                            mime, totalLength
                        );
                        byte[] hBytes = Encoding.UTF8.GetBytes(header);
                        stream.Write(hBytes, 0, hBytes.Length);

                        using (FileStream fs = new FileStream(safePath, FileMode.Open, FileAccess.Read, FileShare.Read))
                        {
                            byte[] chunk = new byte[64 * 1024];
                            int read;
                            while ((read = fs.Read(chunk, 0, chunk.Length)) > 0)
                            {
                                stream.Write(chunk, 0, read);
                            }
                        }
                    }
                }
            }
            catch { }
            finally
            {
                try { client.Close(); } catch { }
            }
        }

        private static string GetMimeType(string ext)
        {
            switch (ext)
            {
                case ".html": case ".htm": return "text/html; charset=utf-8";
                case ".js": case ".mjs": return "application/javascript; charset=utf-8";
                case ".css": return "text/css; charset=utf-8";
                case ".json": return "application/json; charset=utf-8";
                case ".txt": case "": return "text/plain; charset=utf-8";
                case ".png": return "image/png";
                case ".jpg": case ".jpeg": return "image/jpeg";
                case ".gif": return "image/gif";
                case ".svg": return "image/svg+xml";
                case ".ico": return "image/x-icon";
                case ".webp": return "image/webp";
                case ".mp3": return "audio/mpeg";
                case ".ogg": return "audio/ogg";
                case ".wav": return "audio/wav";
                case ".m4a": return "audio/mp4";
                case ".woff": return "font/woff";
                case ".woff2": return "font/woff2";
                case ".ttf": return "font/ttf";
                case ".otf": return "font/otf";
                default: return "application/octet-stream";
            }
        }
    }
}
