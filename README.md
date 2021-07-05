# cdme-scangen-ui
An Electron application that offers a more streamlined, user-friendly way to set input options to the main `cdme-scangen` script.

## Install
Install instructions can be found on the repo of the main script, [cdme-scangen](https://github.com/osu-cdme/cdme-scangen).

## Building an Executable
Building is something we are actively figuring out. In order to get something usable by a non-developer, you need to package this application into something like a .exe file. To do this, the most common tool is `electron-builder`. Note: `electron-builder` doesn't support NPM; install yarn before you try and work with this stuff.

Some work on this is already done:
- The `package.json` file already has most of the config done. It currently outputs a .zip-based executable to the `dist` directory when you run `yarn build`. 
- In order to adjust for the file path differences between development and production versions, there is a single variable you switch in `renderer.js`. I couldn't find a simple way for it to automatically detect which context it was being run in, but I was able to bring it to a single-point-of-change scenario.

What's left:
- In order to actually run pyslm, whatever Python executable is being installed needs to have all the python packages (i.e. numpy, shapely, etc.) installed. However, we can't really expect an end user to install from a `requirements.txt` file, or even to have their own Python install, because locating that can be annoying.
  - To handle the "they need a Python install, and we need to be able to locate it", you can download an embeddable `zip` version of Python from their website. This version does not natively support pip; you can get it working through [this guide](https://www.christhoung.com/2018/07/15/embedded-python-windows/). 
  - Handling the packages they need is a work in progress. After you follow the above guide, you can then use `-mpip` from the embedded Python executable, but running that on `requirements.txt` seems to say everything is already cached even if you use `--no-cache-dir`. 
