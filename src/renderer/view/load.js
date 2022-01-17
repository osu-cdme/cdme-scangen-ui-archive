// PURPOSE: Handle page loading and initialization

exports.DrawThumbnails = async () => {
  require('./LayerList').RenderLayerList()
    .then(() => {
      document.getElementById('loading').style.display = 'none';
    });
};
