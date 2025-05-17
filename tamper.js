// ==UserScript==
// @name         Master2000 Grade Importer
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  Adds a "Load CSV" button to import grades into Master2000
// @author       You
// @match        *://s77.master2000.net/*
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    // Create the button
    const button = document.createElement('button');
    button.textContent = 'Load Grades CSV';
    button.style.position = 'fixed';
    button.style.top = '10px';
    button.style.right = '10px';
    button.style.zIndex = '99999';
    button.style.padding = '8px 12px';
    button.style.backgroundColor = '#4CAF50';
    button.style.color = 'white';
    button.style.border = 'none';
    button.style.borderRadius = '4px';
    button.style.cursor = 'pointer';
    button.style.fontWeight = 'bold';

    // Create a status display
    const statusDisplay = document.createElement('div');
    statusDisplay.style.position = 'fixed';
    statusDisplay.style.top = '50px';
    statusDisplay.style.right = '10px';
    statusDisplay.style.zIndex = '99999';
    statusDisplay.style.padding = '8px 12px';
    statusDisplay.style.backgroundColor = '#f0f0f0';
    statusDisplay.style.border = '1px solid #ccc';
    statusDisplay.style.borderRadius = '4px';
    statusDisplay.style.display = 'none';
    statusDisplay.style.maxWidth = '300px';
    statusDisplay.style.maxHeight = '200px';
    statusDisplay.style.overflow = 'auto';

    // Create a hidden file input
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.csv';
    fileInput.style.display = 'none';

    // When button is clicked, trigger the file input
    button.addEventListener('click', function () {
        fileInput.click();
    });

    // Handle file selection
    fileInput.addEventListener('change', function (event) {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();

            reader.onload = function (e) {
                const content = e.target.result;
                // Process the CSV data
                processCSV(content);
            };

            reader.readAsText(file);
        }
    });

    // Function to process CSV data and update grade inputs
    function processCSV(csvData) {
        try {
            // Show status display
            statusDisplay.style.display = 'block';
            statusDisplay.innerHTML = 'Processing CSV data...';

            // Split the CSV into rows
            const rows = csvData.split('\n');

            // Extract header row to get column labels
            const headers = rows[0].split(',');

            // Log info for debugging
            console.log('CSV Headers:', headers);
            console.log('CSV Rows:', rows.length);

            // Get column IDs from the page
            const columnIds = getColumnIds();
            console.log('Column IDs:', columnIds);

            // Get student IDs from the page
            const studentIds = getStudentIds();
            console.log('Student IDs:', studentIds);

            // Start processing from row 1 (skipping header)
            let updatedCount = 0;
            let errorCount = 0;
            let statusText = '';

            for (let i = 1; i < rows.length; i++) {
                // Skip empty rows
                if (!rows[i].trim()) continue;

                const rowData = rows[i].split(',');

                // First column after ID should be student name
                const studentName = rowData[1] ? rowData[1].trim() : '';

                if (!studentName || !studentIds[studentName]) {
                    console.warn(`Student not found: ${studentName}`);
                    statusText += `Student not found: ${studentName}<br>`;
                    errorCount++;
                    continue;
                }

                // Process the grade columns (starting from index 5, which would be "2.1" in your example)
                for (let j = 2; j < headers.length; j++) {
                    const columnLabel = headers[j].trim();
                    const grade = rowData[j] ? rowData[j].trim() : '';

                    // Skip if no grade or if grade is "NA"
                    if (!grade || grade === 'NA') continue;

                    // Get the input element for this student and column
                    const inputElement = getTextInputForColumnAndStudent(columnLabel, studentName);

                    if (!inputElement) {
                        console.warn(`Input element not found for student ${studentName}, column ${columnLabel}`);
                        statusText += `Failed to find input for ${studentName}, column ${columnLabel}<br>`;
                        errorCount++;
                        continue;
                    }

                    // Update the input value
                    inputElement.value = grade;

                    // Trigger the onchange event to ensure Master2000 processes the update
                    const event = new Event('change', { bubbles: true });
                    inputElement.dispatchEvent(event);

                    // Also trigger blur to apply any validation
                    inputElement.dispatchEvent(new Event('blur'));

                    updatedCount++;
                    console.log(`Updated ${studentName} - ${columnLabel} = ${grade}`);
                }
            }

            // Update status display
            statusDisplay.innerHTML = `<strong>Import Complete</strong><br>` +
                `Updated ${updatedCount} grades<br>` +
                `Errors: ${errorCount}<br><br>` +
                statusText +
                `<button id="close-status" style="margin-top: 10px; padding: 5px;">Close</button>`;

            // Add event listener to close button
            document.getElementById('close-status').addEventListener('click', function () {
                statusDisplay.style.display = 'none';
            });

        } catch (error) {
            console.error('Error processing CSV:', error);
            statusDisplay.innerHTML = `<strong>Error:</strong> ${error.message}<br>` +
                `<button id="close-status" style="margin-top: 10px; padding: 5px;">Close</button>`;

            document.getElementById('close-status').addEventListener('click', function () {
                statusDisplay.style.display = 'none';
            });
        }
    }

    function getColumnIds() {
        // Check if the variable exists in the page
        if (typeof strMatrizCadenaAlumnos === 'undefined' || !strMatrizCadenaAlumnos[3]) {
            console.error('strMatrizCadenaAlumnos not found or invalid');
            return {};
        }

        let labelData = strMatrizCadenaAlumnos[3]; // This is an array like ['|id|a|label|b,'id|a|label|b',...]
        let columnIds = {};

        for (let i = 0; i < labelData.length; i++) {
            let parts = labelData[i].split('|');
            if (parts.length >= 4) {
                // Map the label (column header in CSV) to the ID format needed for the input
                columnIds[parts[3]] = parts[1] + "_" + parts[2]; // Map label to id format
            }
        }
        return columnIds;
    }

    function getStudentIds() {
        // They all are a "td" with ColumnaNombre class
        let studentElements = document.querySelectorAll('.ColumnaNombre');
        let studentIds = {};

        for (let i = 0; i < studentElements.length; i++) {
            // ensure we do have ``id`` 
            if (!studentElements[i].hasAttribute('id')) {
                continue;
            }
            // ensure we are indeed a td
            if (studentElements[i].tagName !== 'TD') {
                continue;
            }

            let studentId = studentElements[i].getAttribute('id'); // Formatted like 'Nx[id]'
            let id = studentId.split('x')[1]; // Get the number after 'Nx'

            // now we need to get the name which is the first text child
            let name = '';

            // Find the text node
            for (let j = 0; j < studentElements[i].childNodes.length; j++) {
                if (studentElements[i].childNodes[j].nodeType === 3) { // Text node
                    name = studentElements[i].childNodes[j].textContent.trim();
                    break;
                }
            }

            if (!name && studentElements[i].textContent) {
                name = studentElements[i].textContent.trim();
            }

            // Remove commas in the name
            name = name.replace(/,/g, ''); // Remove commas

            // Remove double spaces
            name = name.replace(/\s+/g, ' '); // Remove double spaces

            if (name) {
                studentIds[name] = id; // Map name to id
            }
        }
        return studentIds;
    }

    function getTextInputForColumnAndStudent(columnLabel, studentName) {
        try {
            // Get the column id
            const columnIds = getColumnIds();
            if (!columnIds[columnLabel]) {
                console.warn(`Column label not found: ${columnLabel}`);
                return null;
            }
            const columnId = columnIds[columnLabel];

            // Get the student id
            const studentIds = getStudentIds();
            if (!studentIds[studentName]) {
                console.warn(`Student name not found: ${studentName}`);
                return null;
            }
            const studentId = studentIds[studentName];

            // Get the input element which is id="cuan_{studentId}_{columnId}"
            const inputId = `cuan_${studentId}_${columnId}`;
            const inputElement = document.getElementById(inputId);

            if (!inputElement) {
                console.warn(`Input element with id ${inputId} not found`);
                return null;
            }

            return inputElement;
        } catch (error) {
            console.error('Error in getTextInputForColumnAndStudent:', error);
            return null;
        }
    }

    // Add elements to the page
    document.body.appendChild(button);
    document.body.appendChild(fileInput);
    document.body.appendChild(statusDisplay);

    // Expose functions to global scope for debugging
    window.getColumnIds = getColumnIds;
    window.getStudentIds = getStudentIds;
    window.getTextInputForColumnAndStudent = getTextInputForColumnAndStudent;

    console.log('Grade CSV Importer added to the page');
})();