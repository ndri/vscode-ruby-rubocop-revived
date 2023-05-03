# 0.9.5
- Hide 'Show documentation for...' quick fix for non-official cops (thanks [@marianosimone](https://github.com/marianosimone))
- Add setting to hide Disable/Ignore suggestions (thanks [@marianosimone](https://github.com/marianosimone))
- Add output channel (thanks [@gurgeous](https://github.com/gurgeous) and [@jgarber-cisco](https://github.com/jgarber-cisco))

# 0.9.4
- Use the Rubocop server when linting if useServer configuration option is set to true (thanks [@gurgeous](https://github.com/gurgeous))
- Strip 'RuboCop server starting on' from Rubocop output (thanks [@gurgeous](https://github.com/gurgeous))

# 0.9.3

- Introduce quick fix functionality that gives you the possibility to fix or ignore one or more errors (thanks [@Verseth](https://github.com/Verseth)) 
- Bugfix where even non-Ruby files were autocorrected (thanks [@Verseth](https://github.com/Verseth)) 

# 0.9.2

- Addded option to autocorrect a file on save (thanks [@Verseth](https://github.com/Verseth))

# 0.9.1

- Changed command description case style to match other extensions
- Fixed bug where running 'Ruby: Autocorrect by Rubocop' would run the default formatter instead of Rubocop (thanks [@jvilk-stripe](https://github.com/jvilk-stripe), see https://github.com/LoranKloeze/vscode-ruby-rubocop-revived/issues/1#issue-1329266889)

# 0.9.0
- Replace deprecated Rubocop argument --auto-correct with --autocorrect
- Add a configuration option to run Rubocop in server mode (to speed up things). This option is available from >= Rubocop 1.31.

# 0.8.6

- Info level cops are displayed as info level
- (internal) eliminate deprecated API

# 0.8.5

- work with rubocop over 0.90

# 0.8.4

- Ignore warnings and proceed if there is valid rubocop output
- fix test

# 0.8.3

- Using relative config file path

# 0.8.2

- update packages that have secirity issues

# 0.8.1

- add `suppressRubocopWarnings` option that ignore warning

# 0.8.0

- add useBundler config. We can set `true` to override to `bundle exec rubocop`

# 0.7.1

- Fix autoCorrection find on windows

# 0.7.0

- Fix autocorrect was not respecting the .rubocop.yml

# 0.6.1

- Accepts a command is prefixed like 'bundle exec'

# 0.6.0

- Set autocorrect as a formatter

# 0.5.0

- Automatically detect and use bundled rubocop

# 0.4.0

- Lint files opened before the extension is loaded.
- Don't clear diagnostics of other files.
- Kill running rubocop process on close a file.
- Run single process at a time (to avoid accidental process bomb) (using queue).
  - This is caused by vscode's project-wide replace (opens all matched file at once).

# 0.3.5

- force `force-exclude` option

# 0.3.4

- don't execute when starting git diff mode

# 0.3.3

- output error when stderr presented
- show specific error message for empty output (to identify problem)

# 0.3.2

- execute on open

# 0.3.1

- Rubocop saves the file before correcting it and runs checks again

# 0.3.0

- Add auto correct command
- display message when config file is not exist

# 0.2.2

- show message when occur errors on parsing JSON

# 0.2.1

- find rubocop from PATH

# 0.2.0

- enable specify config file (e.g. .rubocop.yml)

# 0.1.11

- show warning when rubocop output is empty

# 0.1.10

- handling JSON syntax error
