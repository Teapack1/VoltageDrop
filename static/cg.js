document.addEventListener('DOMContentLoaded', function() {
    const cgForm = document.getElementById('cg-calculator-form');
    const cgCalculateButton = document.querySelector('.btn-cg-calculate');

    if (cgForm && cgCalculateButton) {
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

        checkFormValidity();
        cgForm.addEventListener('input', checkFormValidity);

        cgForm.addEventListener('submit', async function(event) {
            event.preventDefault();

            const formData = new FormData(cgForm);

            const [voltage, ledPower] = formData.get('led_type').split(',').map(Number);
            const cableLength = parseFloat(formData.get('cable_length')) || 3;
            const awg = formData.get('awg') || null;
            const fixtureHeight = parseFloat(formData.get('fixture_height')) || null;
            const levels = parseInt(formData.get('levels')) || null;
            const ledsPerLevel = parseInt(formData.get('leds_per_level')) || 6;

            if (awg && voltage && cableLength) {
                try {
                    const resistanceResponse = await fetch(`/get_resistance/${awg}`);
                    if (resistanceResponse.ok) {
                        const { resistance } = await resistanceResponse.json();

                        const totalLEDs = levels * ledsPerLevel;
                        const initialCurrent = (totalLEDs * ledPower) / voltage;
                        let remainingVoltage = voltage;
                        const levelHeight = fixtureHeight / levels;

                        let resultsHtml = `<p>Total LEDs: ${totalLEDs} pcs</p><br>`;

                        let accumulatedLength = cableLength;
                        let currentLoad = totalLEDs * ledPower;

                        for (let i = 1; i <= levels; i++) {
                            const ledsAtThisLevel = ledsPerLevel * (levels - i + 1);
                            currentLoad = ledsAtThisLevel * ledPower;
                            const current = currentLoad / remainingVoltage;

                            const calculationResponse = await fetch('/calculate', {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json'
                                },
                                body: JSON.stringify({
                                    cables: [{
                                        voltage: remainingVoltage,
                                        load: current,
                                        length: accumulatedLength,
                                        cable_type: awg
                                    }]
                                })
                            });

                            if (calculationResponse.ok) {
                                const resultData = await calculationResponse.json();
                                const voltageDrop = resultData[0].voltage_drop;
                                remainingVoltage -= voltageDrop;

                                if (remainingVoltage < 0) remainingVoltage = 0;

                                let colorClass = '';
                                const voltageDropPercentage = ((voltage - remainingVoltage) / voltage) * 100;
                                if (voltageDropPercentage > 10) {
                                    colorClass = 'red-text';
                                } else if (voltageDropPercentage > 5) {
                                    colorClass = 'orange-text';
                                }

                                resultsHtml += `<p class="${colorClass}">Level ${i}: Final Voltage: ${remainingVoltage.toFixed(2)} V</p>`;

                                // Add length for the next level
                                accumulatedLength += levelHeight;
                            } else {
                                console.error("Error calculating voltage drop:", calculationResponse.statusText);
                                document.getElementById('result').innerHTML = `<p>Error: Unable to calculate voltage drop.</p>`;
                                return;
                            }
                        }

                        document.getElementById('result').innerHTML = resultsHtml;
                    } else {
                        console.error("Error fetching resistance:", resistanceResponse.statusText);
                        document.getElementById('result').innerHTML = `<p>Error: Unable to fetch cable resistance.</p>`;
                    }
                } catch (error) {
                    console.error("An error occurred:", error);
                    document.getElementById('result').innerHTML = `<p>Error: An unexpected error occurred.</p>`;
                }
            } else {
                document.getElementById('result').innerHTML = `<p>Please provide all required fields.</p>`;
            }
        });
    }
});
