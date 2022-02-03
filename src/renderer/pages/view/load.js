// PURPOSE: Handle page loading and initialization

exports.DrawThumbnails = async () => {
    require("./layerlist/layerlist")
        .RenderLayerList()
        .then(() => {
            document.getElementById("loading").style.display = "none";
        });
};
