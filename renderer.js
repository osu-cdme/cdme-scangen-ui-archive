// Load data; requires cdme-scangen repository to be in same folder as cdme-scangen-ui, for now
const optionsData = require('../cdme-scangen/schema.json')

// Remove the placeholder "waiting for data" text
const optionsDiv = document.getElementById('options')
while (optionsDiv.firstChild) {
    optionsDiv.removeChild(optionsDiv.firstChild)
}

for (const key in optionsData) {

    // Create section header
    const header = document.createElement('h2')
    header.textContent = key
    optionsDiv.appendChild(header)

    for (const key2 in optionsData[key]) {

        // Overall container we'll append at the end
        const div = document.createElement('div')
        div.classList.toggle('field') // Inline formatting and other misc. stuff

        // Title
        const p = document.createElement('p')
        p.textContent = optionsData[key][key2].name
        div.append(p)

        // Behavior from here depends on type
        if (optionsData[key][key2].type === 'string') {

            // Multi-Select
            if ('options' in optionsData[key][key2]) {
                const select = document.createElement('select')
                optionsData[key][key2].options.forEach(option => {
                    console.log(option)
                    const optionElement = document.createElement('option')
                    optionElement.value = option
                    optionElement.textContent = option
                    select.appendChild(optionElement)
                })
                select.value = optionsData[key][key2].default
                div.appendChild(select)
            }

            // Otherwise, let them specify their own string
            else {
                const input = document.createElement('input')
                input.value = optionsData[key][key2].default
                div.appendChild(input)
            }
        }

        // Boolean, meaning we should give them a selection menu representing True/False
        else if (optionsData[key][key2].type === 'bool') {
            const select = document.createElement('select')
            const option1 = document.createElement('option')
            option1.value = option1.textContent = 'Yes'
            select.appendChild(option1)
            const option2 = document.createElement('option')
            option2.value = option2.textContent = 'No'
            select.appendChild(option2)
            select.value = optionsData[key][key2].default
            div.appendChild(select)
        }

        // For floats, just give them an input
        else if (optionsData[key][key2].type === 'float') {
            const input = document.createElement('input')
            input.value = optionsData[key][key2].default
            div.appendChild(input)
        }

        // For ints, just give them an input
        // TODO: Input validation (i.e. no decimals here)
        else if (optionsData[key][key2].type === 'int') {
            const input = document.createElement('input')
            input.value = optionsData[key][key2].default
            div.appendChild(input)
        }

        // Overall append
        optionsDiv.appendChild(div)
    }
}

