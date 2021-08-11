(() => {
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
        }];

        var tableSchema = {
            id: "sampleData",
            alias: "Sample Data",
            columns: cols
        };

        schemaCallback([tableSchema]);
    };

    // Download the data
    myConnector.getData = function(table, doneCallback) {
        let connectionData = JSON.parse(tableau.connectionData);
        let headers = { 'Authorization': 'Basic YWRtaW46YWRtaW5wb2dp' };
        let limit = connectionData.limit;
        let couchdb_url = connectionData.couchdb.url;
        let couchdb_database = connectionData.couchdb.database;
        let couchdb_designDocument = connectionData.couchdb.designDocument;
        let couchdb_viewName = connectionData.couchdb.viewName;

        $.ajaxSetup({ headers });
        $.get(`${couchdb_url}/${couchdb_database}/_design/${couchdb_designDocument}/_view/${couchdb_viewName}`, { 
            limit: limit
         }, (resp) => {
            let rows = resp.rows;
            let tableData = [];

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
        }, 'json');
    };

    tableau.registerConnector(myConnector);

    $(() => {
        // Create event listeners for when the user submits the form
        $("#couchdb").submit((e) => {
            e.preventDefault();
            tableau.connectionName = "CouchDB"; // This will be the data source name in Tableau
            tableau.connectionData = JSON.stringify({
                couchdb: {
                    url: $("#couchdb_url").val(),
                    database: $("#couchdb_database").val(),
                    designDocument: $("#couchdb_designDocument").val(),
                    viewName: $("#couchdb_viewName").val(),
                },
                limit: $("#limit").val()
            });
            tableau.submit(); // This sends the connector object to Tableau
        })
    })
})();
