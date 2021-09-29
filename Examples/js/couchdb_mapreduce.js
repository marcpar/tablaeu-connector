(() => {
    // Create the connector object
    var myConnector = tableau.makeConnector();

    // Define the schema
    myConnector.getSchema = function(schemaCallback) {

        // Parse connection data
        const connectionData = JSON.parse(tableau.connectionData);

        // Setting the table schema
        schemaCallback([connectionData.tableSchema]);
    };

    // Download the data
    myConnector.getData = function(table, doneCallback) {

        let couchdbQuery = {
            viewQuery: (couchdb) => {

                /**
                 * GetViewQuery constructor
                 *
                 * @param {CouchDB} couchdb 
                 */
                function GetViewQuery(couchdb) {
                    let headers = { Authorization: `Basic ${couchdb.connectionData.couchdb.credential}` };
                    let couchdb_url = couchdb.connectionData.couchdb.url;
                    let couchdb_database = couchdb.connectionData.couchdb.database;
                    let couchdb_designDoc = couchdb.connectionData.couchdb.designDoc;
                    let couchdb_view = couchdb.connectionData.couchdb.view;

                    // Set request url
                    this.url = `${couchdb_url}/${couchdb_database}/${couchdb_designDoc}/_view/${couchdb_view}`;
    
                    // HTTP Query Parameter
                    this.parameter = {
    
                        // Set max number of rows to return
                        limit: couchdb.connectionData.limit
                    }
    
                    // Set http request headers
                    $.ajaxSetup({ headers });
                };
    
                /**
                 * Success response callback
                 * 
                 * @param {*} resp HTTP Success Response
                 */
                GetViewQuery.prototype.success = function(resp) {
                    let rows = resp.rows;
                    let tableData = [];
        
                    // Iterate over the JSON object
                    for (var i = 0, len = rows.length; i < len; i++) {

                        // Dynamic row based from connectionData.tableSchema.columns
                        let row = {};
                        
                        // Dynamically fill row based on what's specified in table schema
                        couchdb.connectionData.tableSchema.columns.forEach((obj) => {

                            // Column name
                            const column = obj.id;

                            // Set value to column in row
                            row[column] = typeof rows[i].value[column] === 'undefined' ? null : rows[i].value[column]
                        })

                        // Add item to tableData
                        tableData.push(row);
                    }

                    // Append rows to table viewable to Tableau
                    table.appendRows(tableData);

                    doneCallback();
                };
    
                /**
                 * Runs a query to couchdb server
                 */
                GetViewQuery.prototype.runQuery = function() {
                    $.get(this.url, this.parameter, this.success, 'json');
                };
    
                return new GetViewQuery(couchdb);
            }
        };

        let couchdb = (() => {
            /**
             * CouchDB constructor
             */
            function Couchdb() { this.connectionData = JSON.parse(tableau.connectionData) };

            /**
             * Runs couchdb command, implemented in an object that has 'runQuery' method
             * @todo: I need the correct parameter type for 'query'.
             *
             * @param {runQuery: function} query Query Object (GetDocumentQuery / GetViewQuery)
             */
            Couchdb.prototype.runQuery = function(query) { query.runQuery(this) };

            /**
             * Returns the appropriate query based on given type
             *
             * @returns {runQuery: function}
             */
            Couchdb.prototype.getQuery = function() {
                return couchdbQuery['viewQuery']({
                    connectionData: this.connectionData
                });
            };

            return new Couchdb();
        })();

        couchdb.runQuery(couchdb.getQuery());
    };

    tableau.registerConnector(myConnector);

    // Run after the document loads
    $(() => {

        // Form Submit Event
        $("#couchdb").submit((e) => {
            // Prevent form from submitting
            e.preventDefault();

            // Tableau name of connection.
            // This will be the data source name in Tableau
            tableau.connectionName = $("#tableau_connectionName").val();

            // Tableau variables
            tableau.connectionData = JSON.stringify({

                // Table Schema
                tableSchema: {

                    // Table Schema ID
                    id: $("#tableSchema_id").val(),
        
                    // Table Schema Alias
                    alias: $("#tableSchema_alias").val(),
        
                    // Table Schema Columns
                    columns: tableau_columns
                },

                // CouchDB Setup
                couchdb: {
                    url: couchdb_url,
                    credential: couchdb_credential,
                    database: couchdb_database,
                    designDoc: couchdb_designDoc,
                    view: couchdb_view
                },

                // max # of rows to show
                limit: $("#limit").val()
            });

            // This sends the connector object to Tableau
            tableau.submit(); 
        });

        // CouchDB Credentials On-Change
        $("#couchdb_url, #couchdb_username, #couchdb_password").change(handler_credentialsOnChange);

        // CouchDB Database On-Change
        $("#couchdb_database").change(handler_databaseOnChange);

        // CouchDB Design Document On-Change
        $("#couchdb_designDocument").change(handler_designDocumentOnChange);

        // CouchDB View On-Change        
        $("#couchdb_viewName").change(handler_viewOnChange);

        // Tableau Columns On-Change
        $("#tableau_columns").change(handler_tableauColumnsOnChange);

        // Startup script
        function startup() {

            // Fetch CouchDB Databases
            handler_credentialsOnChange();

            // List available data types
            listAvailableDataTypes();
        }

        // Run startup
        startup();
    });

    let couchdb_url;
    let couchdb_credential;
    let couchdb_database;
    let couchdb_designDoc;
    let couchdb_view;
    let tableau_columns;

    /**
     * Returns CouchDB Databases
     *
     * @param {string} url 
     * @param {string} username 
     * @param {string} password 
     * @param {function} callback
     */
    function getCouchdbDatabases(url, username, password, callback) {
        couchdb_url = url;
        couchdb_credential = btoa(`${username}:${password}`);
        return doRequest(`${couchdb_url}/_all_dbs`, callback)
    }

    /**
     * Returns CouchDB Design Docs
     * @param {string} database 
     */
    function getCouchdbDesignDocs(database, callback) {
        couchdb_database = database;
        return doRequest(`${couchdb_url}/${couchdb_database}/_design_docs`, callback);
    }

    /**
     * Returns CouchDB Views
     * @param {string} database 
     */
    function getCouchdbViews(designDoc, callback) {
        couchdb_designDoc = designDoc;
        return doRequest(`${couchdb_url}/${couchdb_database}/${couchdb_designDoc}`, callback);
    }

    /**
     * Fills $("#couchdb_database") DOM
     *
     * @param {*} data 
     */
    function DOM_fillCouchdbDatabases(databases) {

        // Loops through databases
        databases.forEach((database) => {

            // Fills the $("#couchdb_database") DOM element
            $("#couchdb_database")[0].append(new Option(database, database));
        });

        // Get couchdb design docs
        handler_databaseOnChange();
    }

    /**
     * Fills $("#couchdb_designDocument") DOM
     *
     * @param {*} data 
     */
    function DOM_fillCouchdbDesignDocs(response) {

        $("#couchdb_designDocument")[0].innerHTML = '';

        // Loops through response
        response.rows.forEach((row) => {

            // Design Document
            const designDoc = row.id;

            // Fills the $("#couchdb_designDocument") DOM element
            $("#couchdb_designDocument")[0].add(new Option(designDoc, designDoc));
        });

        // Get couchdb views
        handler_designDocumentOnChange();
    }

    /**
     * Fills $("#couchdb_designDocument") DOM
     *
     * @param {*} data 
     */
    function DOM_fillCouchdbViews(response) {

        $("#couchdb_viewName")[0].innerHTML = '';
        
        // Loops through response
        Object.keys(response.views).forEach((view) => {

            // Fills the $("#couchdb_viewName") DOM element
            $("#couchdb_viewName")[0].add(new Option(view, view));
        });

        handler_viewOnChange();
    }

    /**
     * Credentials On-Change Event Handler
     */
    function handler_credentialsOnChange() {
        let url = $("#couchdb_url").val();
        let username = $("#couchdb_username").val();
        let password = $("#couchdb_password").val();
        getCouchdbDatabases(url, username, password, DOM_fillCouchdbDatabases);
    }

    /**
     * Database On-Change Event Handler
     */
    function handler_databaseOnChange() {
        let database = $("#couchdb_database").val();
        getCouchdbDesignDocs(database, DOM_fillCouchdbDesignDocs);
    }

    /**
     * Design Document On-Change Event Handler
     */
    function handler_designDocumentOnChange() {
        let designDoc = $("#couchdb_designDocument").val();
        getCouchdbViews(designDoc, DOM_fillCouchdbViews);
    }

    /**
     * View On-Change Event Handler
     */
    function handler_viewOnChange() {
        couchdb_view = $("#couchdb_viewName").val();
    }

    /**
     * Tableau Fields On-Change Event Handler
     */
    function handler_tableauColumnsOnChange() {

        // Clear tableau columns
        tableau_columns = [];

        // Split columns separated by comma
        const columns = $("#tableau_columns").val().split(',');

        // Loop through columns and add valid columns at the same time
        columns.forEach((column) => {
            const [id, type] = column.trim().split(':').map((i) => i.trim());
            if (typeof tableau.dataTypeEnum[type] === "undefined") {
                alert(`Data type: "${dataType}" is invalid. Please use the available data types listed.`);
                return;
            }
            const dataType = tableau.dataTypeEnum[type];
            tableau_columns.push({ id, dataType })
        });
    }

    /**
     * List available data types
     */
    function listAvailableDataTypes() {
        Object.keys(tableau.dataTypeEnum).forEach((dataType) => {
            const item = document.createElement('li');
            item.appendChild(document.createTextNode(dataType));
            $("#tableau_availableDataTypes")[0].appendChild(item);
        });
    }

    /**
     * Runs HTTP Request
     *
     * @param {string} url 
     * @param {function} callback 
     * @param {string} method
     * @returns 
     */
     function doRequest(url, callback, method = 'GET') {
        return fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Basic ${couchdb_credential}`
            }
        })
        .then(response => response.json())
        .then(callback);
    }
})();
