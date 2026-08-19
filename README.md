# dsh-quick-restart

A standalone dsh bundle that adds the human-facing `/restart` command.

Install it into a profile from this directory:

```sh
dsh plugin --profile web add D:/dsh/dsh-quick-restart
```

Then restart the running Web session with `/restart`. The command starts a detached Node relay with the current dsh entry point, `execArgv`, profile arguments, working directory, and application arguments. The relay waits for the current process to exit before launching the replacement, avoiding a Web port race.

`/restart` accepts no arguments. It returns a usage error for extra input and does not start a process for a pre-cancelled invocation. Active model or tool work is interrupted by the process shutdown; durable session state is reloaded by the replacement process.
