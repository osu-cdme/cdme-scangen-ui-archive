// Behavior linked to the navbar that we don't want to have to duplicate across all the files
document.getElementById('ToViewVectorsScreen').addEventListener('click', (e) => {
  const fs = require('fs');
  if (fs.readdirSync(path.join(paths.GetUIPath(), 'xml')).length === 0) {
    e.preventDefault();
    alert("No XML files to view! Generate some via the 'Generate Vectors' tab.");
  }
});
