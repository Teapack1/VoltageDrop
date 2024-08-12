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
            
            // Get the selected LED type, which includes both voltage and power
            const [voltage, ledPower] = formData.get('led_type').split(',').map(Number);
            const cableLength = parseFloat(formData.get('cable_length')) || 3;
            const awg = formData.get('awg') || null;
            const fixtureHeight = parseFloat(formData.get('fixture_height')) || null;
            const levels = parseInt(formData.get('levels')) || null;
            const ledsPerLevel = parseInt(formData.get('leds_per_level')) || 6;

            if (awg && voltage && cableLength) {
                try {
                    const response = await fetch(`/get_resistance/${awg}`);
                    if (response.ok) {
                        const { resistance } = await response.json();

                        let resultsHtml = '';
                        const totalLEDs = levels && ledsPerLevel ? levels * ledsPerLevel : null;
                        const levelHeight = fixtureHeight && levels ? fixtureHeight / levels : null;

                        if (totalLEDs !== null && levelHeight !== null) {
                            const totalPower = totalLEDs * ledPower;
                            const current = totalPower / voltage;
                            let remainingVoltage = voltage;
                            const initialVoltage = voltage; // Store the initial voltage for percentage calculation
                            let finalVoltage = voltage; // Track final voltage for drop percentage

                            // Total LEDs
                            resultsHtml += `<p>Total LEDs: ${totalLEDs} pcs</p>`;
                            resultsHtml += `<p>&nbsp;</p>`;  // non-breaking space,

                            // Calculate and display voltage for each level
                            for (let i = 1; i <= levels; i++) {
                                const length = i * levelHeight + cableLength;
                                const voltageDrop = calculateVoltageDrop(current, length, resistance);
                                remainingVoltage -= voltageDrop;

                                // Ensure voltage doesn't go below 0
                                if (remainingVoltage < 0) remainingVoltage = 0;

                                // Determine the color based on the voltage drop percentage
                                let colorClass = '';
                                const currentDropPercentage = ((initialVoltage - remainingVoltage) / initialVoltage) * 100;
                                if (currentDropPercentage > 10) {
                                    colorClass = 'red-text';
                                } else if (currentDropPercentage > 5) {
                                    colorClass = 'orange-text';
                                }

                                resultsHtml += `<p class="${colorClass}">Level ${i} Voltage: ${remainingVoltage.toFixed(2)} V</p>`;
                                finalVoltage = remainingVoltage; // Update final voltage after each level
                            }

                            // Calculate the percentage drop from initial voltage to final voltage

                            const voltageDropPercentage = ((initialVoltage - finalVoltage) / initialVoltage) * 100;
                            
                            // print the voltage drop percentage:
                            //console.log(`Voltage Drop Percentage: ${voltageDropPercentage.toFixed(2)}%`);

                            let colorClass = '';

                            if (voltageDropPercentage > 10) {
                                colorClass = 'red-text';
                            } else if (voltageDropPercentage > 5) {
                                colorClass = 'orange-text';
                            }
                            resultsHtml += `<p>&nbsp;</p>`;             
                            resultsHtml += `<p class="${colorClass}">Voltage Drop: ${voltageDropPercentage.toFixed(2)}%</p>`;
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
                document.getElementById('result').innerHTML = `<p>Please provide at least the Number of Levels.</p>`;
            }
        });
    }

    // Function to calculate voltage drop
    function calculateVoltageDrop(current, length, resistance) {
        return current * length * resistance;
    }
});
