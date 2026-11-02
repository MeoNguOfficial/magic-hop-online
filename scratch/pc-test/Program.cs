using System;
using System.Windows.Forms;

namespace CyberBeatHopper
{
    static class Program
    {
        [STAThread]
        static void Main()
        {
            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);
            Form form = new Form { Text = "Cyber Beat Hopper", Width = 800, Height = 600 };
            // Form run test
        }
    }
}
