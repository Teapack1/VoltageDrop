document.addEventListener('DOMContentLoaded', function() {
    // Handle form submission for Crystal Grid calculator
    const cgForm = document.getElementById('cg-calculator-form');
    const cgCalculateButton = document.querySelector('.btn-cg-calculate'); // Select the calculate button
    
    if (cgForm && cgCalculateButton) {
        // Check form validity and toggle the calculate button state
        function checkFormValidity() {
            const isValid = cgForm.checkValidity();
            if (isValid) {
                cgCalculateButton.disabled = false;
                cgCalculateButton.classList.add('enabled');
            } else {
                cgCalculateButton.disabled = true;
                cgCalculateButton.classList.remove('enabled');
            }
        }

        // Initial check on page load
        checkFormValidity();

        // Add event listener to check form validity on input change
        cgForm.addEventListener('input', checkFormValidity);

        // Handle form submission
        cgForm.addEventListener('submit', async function(event) {
            event.preventDefault();  // Prevent the default form submission

            const formData = new FormData(cgForm);
            const voltage = parseFloat(formData.get('voltage')) || null;
            const cableLength = parseFloat(formData.get('cable_length')) || null;
            const awg = formData.get('awg') || null;
            const fixtureHeight = parseFloat(formData.get('fixture_height')) || null;
            const levels = parseInt(formData.get('levels')) || null;
            const ledsPerLevel = parseInt(formData.get('leds_per_level')) || 6;
            const ledPower = parseFloat(formData.get('led_power')) || null;

            const totalLEDs = levels && ledsPerLevel ? levels * ledsPerLevel : null;
            const levelHeight = fixtureHeight && levels ? fixtureHeight / levels : null;

            if (awg && voltage && cableLength) {
                try {
                    const response = await fetch(`/get_resistance/${awg}`);
                    if (response.ok) {
                        const { resistance } = await response.json();

                        let resultsHtml = '';
                        if (totalLEDs !== null && levelHeight !== null && ledPower !== null) {
                            const totalPower = totalLEDs * ledPower;
                            const current = totalPower / voltage;
                            let remainingVoltage = voltage;

                            resultsHtml += `<p>Total LEDs: ${totalLEDs}</p>`;
                            for (let i = 1; i <= levels; i++) {
                                const length = i * levelHeight + cableLength;
                                const voltageDrop = calculateVoltageDrop(current, length, resistance);
                                remainingVoltage -= voltageDrop;
                                resultsHtml += `<p>Level ${i}: Final Voltage: ${remainingVoltage.toFixed(2)} V</p>`;
                            }
                        } else {
                            resultsHtml = `<p>Partial data provided. Calculation incomplete.</p>`;
                        }
                        document.getElementById('result').innerHTML = resultsHtml;
                    } else {
                        console.error("Error fetching resistance:", response.statusText);
                        document.getElementById('result').innerHTML = `<p>Error: Unable to fetch cable resistance.</p>`;
                    }
                } catch (error) {
                    console.error("An error occurred:", error);
                    document.getElementById('result').innerHTML = `<p>Error: An unexpected error occurred.</p>`;
                }
            } else {
                document.getElementById('result').innerHTML = `<p>Please provide at least Voltage, Cable Length, and AWG to perform calculations.</p>`;
            }
        });
    }

    // Function to calculate voltage drop
    function calculateVoltageDrop(current, length, resistance) {
        return current * length * resistance;
    }
});
