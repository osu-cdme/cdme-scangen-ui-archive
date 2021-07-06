# cdme-scangen-ui
An Electron application that offers a more streamlined, user-friendly way to set input options to the main `cdme-scangen` script.

## Install
Install instructions can be found on the repo of the main script, [cdme-scangen](https://github.com/osu-cdme/cdme-scangen). Tl;dr is required to install this repository parallel to `cdme-scangen` so that certain path stuff works out.

## Building an Executable
Building is something we are actively figuring out. In order to get something usable by a non-developer, you need to package this application into something like a .exe file. To do this, the most common tool is `electron-builder`, which is what we've gone with. Note that `electron-builder` advises you use yarn instead of npm, so install yarn before you try and work with this stuff.

Progress So Far:
- The `package.json` file already has most of the config done. It currently outputs a .zip-based executable to the `dist` directory when you run `yarn build`. 
- In order to adjust for the file path differences between development and production versions, there is a single variable you switch in `renderer.js`. I couldn't find a simple way for it to automatically detect which context it was being run in, but I was able to bring it to a single-point-of-change scenario.
- Lots of random stuff that's summarized in the following steps.

Steps To Get Up To Speed:
- Install an embeddable Python version (one of the Python 3.9 versions is recommended). The below instructions assume you've installed it into this repository such that the path to the Python executable is `cdme-scangen-ui/python/python.exe`.
- To get `pip` on the embeddable Python version, follow [this guide](https://www.christhoung.com/2018/07/15/embedded-python-windows/). 
- To install (most of; see below) the required `pyslm` packages, execute `python/python.exe -mpip install -r ../cdme-scangen/requirements.txt` from this directory.
  - Command assumes `cdme-scangen` is installed parallel to this repository.
  - The only way I've found to ensure it installs the packages to the local Python version instead of a system-wide one you may have already installed them on is to remove any other Python installations you have. This even occurs if you use the `--no-cache-dir` option, oddly enough.

Remaining Issue(s):
- When you try and install every `pyslm` requirement, the `triangle` package throws an error something along the lines of `Cannot find Python.h`. There's nothing on google specific to our circumstance, but it's generally due to being unable to find the Visual C++ Build Tools. Past that, not really sure why it's occurring, but I've opened an issue on the `pyslm` repo [here](https://github.com/drlukeparry/pyslm/issues/11) so we can hopefully get some guidance from the author on how he'd approach this.
