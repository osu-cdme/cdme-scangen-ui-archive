function createInputWithLabel (label, value, constraintsText) {
  const div = document.createElement('div');
  const span = document.createElement('span');
  span.textContent = label;
  div.append(span);
  const input = document.createElement('input');
  input.type = 'text';
  input.id = 'input_' + label;
  input.value = value;
  div.append(input);
  const constraints = document.createElement('span');
  constraints.classList.toggle('constraints');
  constraints.textContent = constraintsText;
  div.append(constraints);
  return div;
}

function createElementWithText (tag, text) {
  const element = document.createElement(tag);
  element.textContent = text;
  return element;
}

exports.createInputWithLabel = createInputWithLabel;
exports.createElementWithText = createElementWithText;
