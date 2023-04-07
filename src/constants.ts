import { DocumentSelector } from "vscode";

export const PROTOLINT_REPO_URI = "https://github.com/yoheimuta/protolint";

export const PATH_CONFIGURATION_KEY = "path";

// This works when the linter executable softlink is available 
// in the shell.
export const FAILOVER_PATH = "protolint";

// At the moment allows only files on a disk. Change `scheme` if start linting from memory.
export const PROTOBUF_SELECTOR: DocumentSelector = [
    { language: "proto3", scheme: "file" },
    { language: "proto", scheme: "file" }
]