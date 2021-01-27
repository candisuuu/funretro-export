# FunRetro.io export

[![License][license-badge]][license-url]

> CLI tool to easily export [FunRetro.io](https://funretro.io/) retrospective boards using Playwright

> **Updates (2021/01/27) from original repository:**
> * [fast-csv](https://www.npmjs.com/package/fast-csv) dependency for CSV formatting
> * Option to export as CSV or TXT filetype
> * RegEx validation for user input URL and filetype
> * Selector for board title changed to ".board-name" as "#board-name" is not present in the document
> * Comments to better explain how the process works for anyone who wants to work from this repository
> * For CSV: Board messages with 0 votes are not included in the output file

## Installing / Getting started

It's required to have [npm](https://www.npmjs.com/get-npm) installed locally to follow the instructions.
When starting the application you will need to enter a valid URL and either "csv" or "txt" for the filetype you want to output.
> Example: "https://easyretro.io/publicboard..." "csv" will output MyBoardTitle.csv to the repository directory

```shell
git clone https://github.com/candisuuu/funretro-export.git
cd funretro-export
npm install
npm start -- "https://easyretro.io/publicboard..." "[file extension]"
```

## TODO
* Explore possible routes that can decrease the amount of code to compile (2021/01/27)
* Additional file export options - PDF filetype, file directory (including create new directory), file name (2021/01/27)
* Explore card comments (2020/08)

## Licensing

MIT License

[license-badge]: https://img.shields.io/github/license/robertoachar/docker-express-mongodb.svg
[license-url]: https://opensource.org/licenses/MIT
