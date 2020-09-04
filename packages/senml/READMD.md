# SenML Utils

Tool to convert data between SenML and JSON formats.

## Sensor Measurement Lists(SenML)

This specification defines a format for representing simple sensor measurements and device parameters in Sensor Measurement Lists (SenML). Representations are defined in JavaScript Object Notation (JSON), Concise Binary Object Representation (CBOR), Extensible Markup Language (XML), and Efficient XML Interchange (EXI), which share the common SenML data model. A simple sensor, such as a temperature sensor, could use one of these media types in protocols such as HTTP or the Constrained Application Protocol (CoAP) to transport the measurements of the sensor or to be configured.

## Usage

- Convert SenML to JSON
- Convert JSON to SenML
- Validate SenML

## ToDos

- [] Initial
- [] Test
- [] UI
- [] Package

## References

- [SenML](https://github.com/mainflux/senml)

This repository contains a lightweight implementation of [RFC 8428 Sensor Measurement Lists (SenML)](https://tools.ietf.org/html/rfc8428)

**Normalization** Normalized (resolved) SenML Pack consists of resolved SenML Records. A SenML Record is referred to as "resolved" if it does not contain any base values, i.e., labels starting with the character "b", except for Base Version fields, and has no relative times.\*

**Validation** Valid SenML Record is the record with valid all the required fields and exactly one value field. Base values, if present, must be valid, as well. The Pack is valid if all the Records are valid and have the same Base Version. All SenML Records in a Pack must have the same version number. This is typically done by adding a Base Version field to only the first Record in the Pack or by using the default value.\*

- [Create Your First Github Package](https://dev.to/dalenguyen/create-your-first-github-package-564f)

- [typescript-package-starter](https://github.com/gaoxiaoliangz/typescript-package-starter)

A simple starter for TypeScript packages, easy to be published via npm.

- [GitHub Actions: Publishing Bundled Packages With TypeScript](https://medium.com/swlh/publishing-typescript-packages-with-github-actions-3b484f34bacd)

- [Step by step: Building and publishing an NPM Typescript package](https://itnext.io/step-by-step-building-and-publishing-an-npm-typescript-package-44fe7164964c)
