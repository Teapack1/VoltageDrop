document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('calculator-form');
    const cableContainer = document.getElementById('cable-container');
    const addCableButton = document.getElementById('add-cable');
    const calculateButton = document.querySelector('.btn-calculate');
    let cableCount = 1;
    const maxCables = 3;

    // Function to check if all form fields are filled
    function checkFormValidity() {
        const isValid = form.checkValidity();
        if (isValid) {
            calculateButton.disabled = false;
            calculateButton.classList.add('enabled');
        } else {
            calculateButton.disabled = true;
            calculateButton.classList.remove('enabled');
        }
    }

    // Function to update the IDs and names of the inputs in each cable group
    function updateCableGroupInputs() {
        const cableGroups = document.querySelectorAll('.cable-group');
        cableGroups.forEach((group, index) => {
            group.querySelectorAll('input, select').forEach(input => {
                // Update the id and name attributes to include the index
                const baseName = input.name.split('[')[0]; // Get the base name without the index
                input.name = `${baseName}[${index}]`;
                input.id = `${baseName}-${index}`; // Update the id as well for accessibility
            });
        });
    }

    // Function to copy values from the first cable group
    function copyInitialCableValues(newCableGroup) {
        const initialCableGroup = document.querySelector('.cable-group');

        // Copy values from the initial cable group to the new cable group
        initialCableGroup.querySelectorAll('input, select').forEach((input, index) => {
            const correspondingInput = newCableGroup.querySelectorAll('input, select')[index];
            correspondingInput.value = input.value;
        });
    }

    // Function to update the visibility of the remove buttons
    function updateRemoveButtons() {
        const removeButtons = document.querySelectorAll('.btn-remove-cable');
        removeButtons.forEach(button => {
            if (cableCount > 1) {
                button.style.display = 'inline-block';
            } else {
                button.style.display = 'none';
            }
        });
    }

    // Add a new cable section
    addCableButton.addEventListener('click', function() {
        if (cableCount < maxCables) {
            const newCableGroup = document.querySelector('.cable-group').cloneNode(true);
            
            // Copy values from the initial cable group
            copyInitialCableValues(newCableGroup);

            // Append the new cable group to the container
            cableContainer.appendChild(newCableGroup);
            cableCount++;
            updateCableGroupInputs();
            updateRemoveButtons();
            checkFormValidity();
        }
        if (cableCount >= maxCables) {
            addCableButton.disabled = true;
        }
    });

    // Remove a cable section
    cableContainer.addEventListener('click', function(event) {
        if (event.target.classList.contains('btn-remove-cable')) {
            if (cableCount > 1) {
                event.target.closest('.cable-group').remove();
                cableCount--;
                updateCableGroupInputs();
                addCableButton.disabled = false;
                updateRemoveButtons();
                checkFormValidity();
            }
        }
    });

    // Handle form submission
    form.addEventListener('submit', async function(event) {
        event.preventDefault();

        const formData = new FormData(form);
        const cablesData = [];

        // Iterate over the form data and collect all cables
        for (let i = 0; i < cableCount; i++) {
            const voltage = parseFloat(formData.get(`voltage[${i}]`));
            const load = parseFloat(formData.get(`load[${i}]`));
            const length = parseFloat(formData.get(`length[${i}]`));
            const cable_type = formData.get(`cable_type[${i}]`);

            cablesData.push({ voltage, load, length, cable_type });
        }

        console.log("Sending cables data:", cablesData); // Debugging line

        // Send the cables data to the backend
        const response = await fetch('/calculate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ cables: cablesData })
        });

        if (response.ok) {
            const results = await response.json();

            // Display the results
            let resultsHtml = '';
            results.forEach((result, index) => {
                resultsHtml += `<p>Cable ${index + 1}: Voltage Drop: ${result.voltage_drop.toFixed(2)} V</p>`;
            });
            document.getElementById('result').innerHTML = resultsHtml;
        } else {
            console.error("Error:", response.statusText);
        }
    });

    // Initially check the form validity and update buttons on page load
    form.addEventListener('input', checkFormValidity);
    checkFormValidity();
    updateRemoveButtons();
});
