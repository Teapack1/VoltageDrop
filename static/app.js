document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('calculator-form');
    const calculateButton = document.querySelector('.btn-calculate');

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

    // Listen for input events on the form to trigger validation
    form.addEventListener('input', checkFormValidity);

    // Initially check the form validity on page load
    checkFormValidity();

    // Handle form submission
    form.addEventListener('submit', async function(event) {
        event.preventDefault();

        const formData = new FormData(event.target);
        const data = {
            voltage: parseFloat(formData.get('voltage')),
            load: parseFloat(formData.get('load')),
            length: parseFloat(formData.get('length')),
            cable_type: formData.get('cable_type')
        };

        const response = await fetch('/calculate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });

        const result = await response.json();
        document.getElementById('result').innerText = `Result Voltage: ${result.voltage_drop} V`;
    });
});
