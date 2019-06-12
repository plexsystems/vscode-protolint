# vscode-protobuflinter
[![License](https://img.shields.io/:license-mit-blue.svg)](https://github.com/jpreese/vscode-protobuflint/blob/master/LICENSE)

vscode-protobuf linter is a protocol buffer linter for [Visual Studio Code](https://code.visualstudio.com/) that uses [protolint](https://github.com/yoheimuta/protolint) to validate linting rules.

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