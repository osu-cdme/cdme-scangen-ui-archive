# cdme-scangen-ui

An Electron application that offers a more streamlined, user-friendly way to set input options to the main `cdme-scangen` script.

## Install

Before you install this, first follow the installation instructions in [cdme-scangen](https://github.com/osu-cdme/cdme-scangen). 

You'll need to install the following prior to this: 
- [Git](https://git-scm.com/downloads), the version control system we use. All the default options are fine. 
- [Node.js](https://nodejs.org/en/download/), the JavaScript runtime the UI runs off of. 
- [GitKraken](https://www.gitkraken.com/download), a GUI that makes Git easier to work with. Optional if you're familiar with command-line Git. 
- A text editor. Most of us recommend [VSCode](https://code.visualstudio.com/download). 

Then, do the following: 
1. **Set Up Folders.** Create a folder called `cdme` somewhere on your machine - your choice where. If you created this as part of the `cdme-scangen` instructions, simply use that one. The goal is to get all our repositories in one folder next to each other. 
2. **Clone This Repo.** Use GitKraken to clone this repository into that folder. When you're done, the `cdme-scangen-ui` folder should be inside the `cdme` folder, right beside the `cdme-scangen` folder. 
3. **Install/Configure Python.** In order to package the application correctly, you need an embedded python version with all the Python dependencies. 
    - For CDME personnel, you can find this on OneDrive at `CDME Rindler Research Group > Scan Strategy Development > pyslm_embedded_python > python.zip`. Download it. For anyone else trying to use our infrastructure, read the 'Putting together an embedded Python interpreter' section below. 
    - Unzip that and copy it into this directory such that `cdme-scangen-ui/python/python.exe` is the path to that interpreter. 
4. **Install JavaScript Dependencies.**
    - Open a command line and `cd` into this folder. If you're not sure how to do this, google how to navigate a file system in whatever command line you're using (we recommend Git Bash).
    - Execute `npm install yarn` and wait until it finishes. Yarn is a package manager that works better than npm when it comes to building our application into an executable.
    - Restart VSCode. The goal here is to propogate `$PATH` environment variable changes.
    - `cd` into this directory again and execute `yarn`. If you did things correctly, it should recognize the command and install all the project dependencies, as defined in the `package.json` file. 

You should be set! 

### Install alsam-xml
Our custom library for parsing XML files into JSON, [alsam-xml.js](https://github.com/osu-cdme/alsam-xml.js), doesn't need to be cloned if you aren't planning to do any development on it. It's on npm and will be installed alongside the rest of the JavaScript dependencies, so if you don't know what any of this means, ignore this section and you should be fine. 

If you need to make modifications, you'll need to clone that into the `cdme` folder and alter two file paths in the application (`LoadXML` in `src/renderer/common.js` and `ExportXML` in `src/renderer/view/export.js`) to target that file, instead of using the version that yarn installs into `node_modules`. 

## Run 
To run the application, open a terminal to this directory and run `yarn start`. 


## Building an Executable

In order to get something usable by a non-developer, you need to package this application into something like a .exe file. To do this, the most common tool is `electron-builder`, which is what we've gone with. Note that `electron-builder` recommends `yarn` instead of `npm`. 

In order to build:
- Switch the `building` variable in `src/main/paths.js` to `True`. Building changes working directories for some weird reason, so this circumvents that. 

Then, execute `yarn build` from the root directory. This will place the output in the `dist` directory, which will output both a `.zip` and normal folder version of the repository. You should be able to send this `.zip` to someone, they unzip it, then run the .exe file inside, without them needing to download anything else.

### Putting together an embedded Python interpreter

Note that this section may be minorly out of date.

For convenience for CDME workers, a `python.zip` file is included on OneDrive at `CDME Rindler Research Group > Scan Strategy Development > pyslm_embedded_python > python.zip`, which should work fine for the forseeable future. Simply unzip it and make sure it adheres to the above file structure and you should be fine.

Unfortunately, this file is too large to include via Git due to GitHub's file size limits, and git-lfs is a step we think is unnecessary. If you do not have access to that file or need to build the embedded Python version from scratch for any reason, follow these instructions:

-   Install an embeddable Python version (one of the Python 3.9 versions is recommended). The below instructions assume you've installed it into this repository such that the path to the Python executable is `cdme-scangen-ui/python/python.exe`.
-   To get `pip` on the embeddable Python version, follow [this guide](https://www.christhoung.com/2018/07/15/embedded-python-windows/).
-   To install (most of; see below) the required `pyslm` packages, execute `python/python.exe -mpip install -r ../cdme-scangen/requirements.txt` from this directory.
    -   Command assumes `cdme-scangen` is installed parallel to this repository.
    -   The only way I've found to ensure it installs the packages to the local Python version instead of a system-wide one you may have already installed them on is to remove any other Python installations you have. This even occurs if you use the `--no-cache-dir` option, oddly enough, though maybe that's something set up incorrectly on my end.

### Important Limitations

We've gotten building working, but with some limitations:

-   The `triangle` library, which higher `pyslm` versions will eventually require (adding supports - see [this issue](https://github.com/drlukeparry/pyslm/issues/11)) is more complicated to get working. The library doesn't need it for now, so we simply don't include it in the embedded Python version.

## Attributions

This infrastucture makes heavy use of the [pyslm](https://github.com/drlukeparry/pyslm/) library written by [@drlukeparry](https://github.com/drlukeparry) for all the difficult slicing and hatching. Many thanks to him. 
