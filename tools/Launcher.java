import java.io.File;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.List;

public class Launcher {
  public static void main(String[] args) throws Exception {
    Path jarPath = Paths.get(Launcher.class.getProtectionDomain().getCodeSource().getLocation().toURI());
    File jarFile = jarPath.toFile();
    File rootDir = jarFile.getParentFile().getParentFile();
    File script = new File(rootDir, "bin\\sorter64.js");

    if (!script.exists()) {
      System.err.println("sorter64 launcher: script not found at " + script.getAbsolutePath());
      System.exit(2);
    }

    List<String> cmd = new ArrayList<>();
    cmd.add("node");
    cmd.add(script.getAbsolutePath());
    for (String arg : args) {
      cmd.add(arg);
    }

    ProcessBuilder pb = new ProcessBuilder(cmd);
    pb.inheritIO();
    Process p = pb.start();
    int code = p.waitFor();
    System.exit(code);
  }
}
