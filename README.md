# cdme-scangen-ui

An Electron application that offers a more streamlined, user-friendly way to set input options to the main `cdme-scangen` script.

## Install

Install instructions can be found on the repo of the main script, [cdme-scangen](https://github.com/osu-cdme/cdme-scangen). The tl;dr is to go through the setup for the other repo, then install this repository parallel to `cdme-scangen` so that paths work correctly.

You also need to clone [alsam-xml.js](https://github.com/osu-cdme/alsam-xml.js), a library we built, parallel to this library, and rename that folder to `alsam-xml` if it's anything else. In the end, the `cdme-scangen`, `cdme-scangen-ui`, and `alsam-xml` folders should all be parallel to each other.

## Building an Executable

In order to get something usable by a non-developer, you need to package this application into something like a .exe file. To do this, the most common tool is `electron-builder`, which is what we've gone with. Note that `electron-builder` advises you use `yarn` instead of `npm`, so it's recommended to install `yarn` before you try and work with this stuff.

In order to build:

-   Ensure you've run `npm install` or `yarn` in the base directory to install all the Electron dependencies.
-   Ensure you have an embedded Python version with all the [cdme-scangen](https://github.com/osu-cdme/cdme-scangen) requirements inside a folder called `python` in this folder such that `cdme-scangen-ui/python/python.exe` is the valid path to the executable. See below for instructions on how to get a valid executable.
-   Ensure the `cdme-scangen` repository is located such that the `cdme-scangen` and `cdme-scangen-ui` repositories are parallel (in the same folder).

Important things about the build system:

-   You will need to switch one variable defined at the top of `renderer.js` depending on whether you're running the app normally or building it. This adjusts certain file paths so everything doesn't crash and burn.

Then, execute `yarn build` from the root directory. This will place the output in the `dist` directory, which will output both a `.zip` and normal folder version of the repository. You should be able to send this `.zip` to someone, they unzip it, then run the .exe file inside, without them needing to download anything else.

### Getting an Embedded Python Executable

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
