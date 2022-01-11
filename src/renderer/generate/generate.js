const path = require('path');
const paths = require('../paths.js');

// Load data; requires cdme-scangen repository to be in parallel folder to cdme-scangen-ui, for now
const optionsData = require(path.join(paths.GetBackendPath(), 'schema.json'));
exports.optionsData = optionsData;

// Handles generating UI inputs for the rest, which is generalizable
const specialElements = new Set(['Hatch Default ID', 'Contour Default ID', 'Segment Styles', 'Velocity Profiles']);
function generateRemainingDOM () {
  const div = document.createElement('div');
  div.appendChild(SectionHeaderDOM('General'));
  for (const key in optionsData) {
    if (specialElements.has(key)) continue;
    div.appendChild(SectionHeaderDOM(key));
    for (const key2 in optionsData[key]) {
      const option = document.createElement('div');
      option.classList.toggle('field');

      // Title
      const label = document.createElement('label');
      label.textContent = optionsData[key][key2].name;
      option.append(label);

      // Behavior from here depends on type
      if (optionsData[key][key2].type === 'string') {
        if ('options' in optionsData[key][key2]) {
          const select = document.createElement('select');
          select.name = optionsData[key][key2].name;
          optionsData[key][key2].options.forEach((option) => {
            const optionElement = document.createElement('option');
            optionElement.value = option;
            optionElement.textContent = option;
            select.appendChild(optionElement);
          });
          select.value = optionsData[key][key2].default;
          option.appendChild(select);
        } else {
          const input = document.createElement('input');
          input.value = optionsData[key][key2].default;
          input.name = optionsData[key][key2].name;
          input.type = 'text';
          option.appendChild(input);
        }
      } else if (optionsData[key][key2].type === 'bool') {
        const select = document.createElement('select');
        select.name = optionsData[key][key2].name;
        const option1 = document.createElement('option');
        option1.value = option1.textContent = 'Yes';
        select.appendChild(option1);
        const option2 = document.createElement('option');
        option2.value = option2.textContent = 'No';
        select.appendChild(option2);
        select.value = optionsData[key][key2].default;
        option.appendChild(select);
      } else if (optionsData[key][key2].type === 'float' || optionsData[key][key2].type === 'int') {
        const input = document.createElement('input');
        input.value = optionsData[key][key2].default;
        input.name = optionsData[key][key2].name;
        input.type = 'text';
        option.appendChild(input);
      }

      if ('units' in optionsData[key][key2]) {
        const units = document.createElement('p');
        units.classList.toggle('units');
        units.textContent = '(' + optionsData[key][key2].units + ')';
        option.appendChild(units);
      }

      const desc = document.createElement('p');
      desc.classList.toggle('desc');
      desc.textContent = optionsData[key][key2].desc;
      option.appendChild(desc);

      // Overall append
      div.appendChild(option);
    }
  }

  return div;
}

function SectionHeaderDOM (text) {
  const header = document.createElement('h2');
  header.textContent = text;
  return header;
}

// Generate and append UI corresponding to the schema
const { SegmentStyles } = require('./SegmentStyles.js');
const { VelocityProfiles } = require('./VelocityProfiles.js');
const styles = new SegmentStyles();
const profiles = new VelocityProfiles();
document.getElementById('options').appendChild(generateRemainingDOM());

// Make the contents of the select menu the contents of the 'xml' directory
const fs = require('fs');
const files = fs.readdirSync(path.join(paths.GetBackendPath(), 'geometry'));
for (const file of files) {
  const option = document.createElement('option');
  option.textContent = file;
  option.value = file;
  document.getElementsByName('Part File Name')[0].appendChild(option);
}

const { spawnProcess } = require('./spawning.js');
document.getElementById('start').addEventListener('click', () => {
  spawnProcess(styles.Get(), profiles.Get(), styles.GetDefaults());
});
