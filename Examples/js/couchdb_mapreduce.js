(function() {
    // Create the connector object
    var myConnector = tableau.makeConnector();

    // Define the schema
    myConnector.getSchema = function(schemaCallback) {
        var cols =[{
            id: "id",
            dataType: tableau.dataTypeEnum.string
        },{
            id: "name",
            dataType: tableau.dataTypeEnum.string
        }, {
            id: "x",
            dataType: tableau.dataTypeEnum.int
        }, {
            id: "y",
            dataType: tableau.dataTypeEnum.int
        }]

        var tableSchema = {
            id: "earthquakeFeed",
            alias: "Earthquakes with magnitude greater than 4.5 in the last seven days",
            columns: cols
        };

        schemaCallback([tableSchema]);
    };

    // Download the data
    myConnector.getData = function(table, doneCallback) {
        $.ajaxSetup({
            headers : {
                'Authorization' : 'Basic YWRtaW46YWRtaW5wb2dp'
            }
        });
        $.getJSON("http://localhost:5984/pogidb/_design/test/_view/poging-view", function(resp) {
            var rows = resp.rows,
                tableData = [];

            // Iterate over the JSON object
            for (var i = 0, len = rows.length; i < len; i++) {
                tableData.push({
                    "id": rows[i].id,
                    "name": rows[i].key,
                    "x": rows[i].value.x,
                    "y": rows[i].value.y
                });
            }

            table.appendRows(tableData);
            doneCallback();
        });
    };

    tableau.registerConnector(myConnector);

    // Create event listeners for when the user submits the form
    $(document).ready(function() {
        $("#submitButton").click(function() {
            tableau.connectionName = "CouchDB"; // This will be the data source name in Tableau
            tableau.submit(); // This sends the connector object to Tableau
        });
    });
})();
