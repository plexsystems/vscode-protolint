# vscode-protobuflinter [![License](https://img.shields.io/:license-mit-blue.svg)](https://github.com/jpreese/vscode-protobuflint/blob/master/LICENSE) [![GitHub release](https://img.shields.io/github/release/jpreese/vscode-protobuflint.svg)](https://github.com/jpreese/vscode-protobuflint/releases)

![protobuflinter_logo](img/protobuflint_logo128.png)

vscode-protobuflinter is a protocol buffer linter for [Visual Studio Code](https://code.visualstudio.com/) that uses [protolint](https://github.com/yoheimuta/protolint) to validate linting rules.

## Example

Using the following `.protolint.yaml` configuration file

```yaml
lint:
  rules:
    no_default: true

    add:
      - MESSAGE_NAMES_UPPER_CAMEL_CASE
```

Renders the following display within visual studio code

![protobuflintexample](img/protobuflint_screen.png)

## Local Development

To compile the solution locally run `npm run compile`

To run the unit tests run `npm run test`

To run the extension in a Visual Studio Code development environment press `F5` in Visual Studio Code
