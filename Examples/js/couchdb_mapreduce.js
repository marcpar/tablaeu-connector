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
                    let couchdb_from = couchdb.connectionData.couchdb.from;
                    let couchdb_to = couchdb.connectionData.couchdb.to;
                    let couchdb_query = couchdb.connectionData.couchdb.query;

                    // Set request url
                    this.url = `${couchdb_url}/${couchdb_database}/${couchdb_designDoc}/_view/${couchdb_view}?${couchdb_from}${couchdb_to}${couchdb_query}`;
  
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
                        couchdb.connectionData.tableSchema.columns.forEach((obj, index) => {

                            // Column name
                            const column = obj.id;

                            // Column value in row
                            const value = _readRow(rows[i], couchdb.connectionData.column_paths[index]);

                            // Set value to column in row
                            row[column] = typeof value === 'undefined' ? null : value;
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
                    $.get(this.url, {}, this.success, 'json');
                };

                /**
                 * Reads row on specific path
                 *
                 * @param {*} row 
                 * @param {*} path 
                 * @param {boolean} not_root 
                 */
                function _readRow(row, path, not_root = false) {
                    const _path = path.split('.');
                    let value = row;
                    if (!couchdb.connectionData.root_document && not_root === false) {
                        return _readRow(row.value, path, true);
                    }
                    _path.forEach((key) => { value = value[key] });
                    return value;
                }
    
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
                    view: couchdb_view,
                    from: couchdb_from,
                    to: couchdb_to,
                    query: couchdb_query
                },

                // Whether we read from the root document of result
                root_document: tableau_root_document,

                // Path to column
                column_paths: tableau_column_paths,

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

        // CouchDB From On-Change
        $("#couchdb_from").change(handler_fromOnChange);

        // CouchDB To On-Change
        $("#couchdb_to").change(handler_toOnChange);

        // CouchDB Query On-Change
        $("#couchdb_query").change(handler_queryOnChange);

        // Tableau Columns On-Change
        $("#tableau_columns").change(handler_tableauColumnsOnChange);

        // Tableau Root Document On-Change
        $("#tableau_root_document").change(handler_tableauRootDocumentOnChange);

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
    let couchdb_from = '';
    let couchdb_to = '';
    let couchdb_query = '';
    let tableau_columns;
    let tableau_column_paths;
    let tableau_root_document = false;

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
     * View On-Change Event Handler
     */
    function handler_fromOnChange() {
        couchdb_from = $("#couchdb_from").val();
        couchdb_from = couchdb_from === '' ? '' : + new Date(couchdb_from);
        couchdb_from = couchdb_from === '' ? '' : '' + `startkey=${couchdb_from}&`;
    }

    /**
     * View On-Change Event Handler
     */
    function handler_toOnChange() {
        couchdb_to = $("#couchdb_to").val();
        couchdb_to = couchdb_to === '' ? '' : + new Date(couchdb_to);
        couchdb_to = couchdb_to === '' ? '' : '' + `endkey=${couchdb_to}&`;
    }

    /**
     * View On-Change Event Handler
     */
    function handler_queryOnChange() {
        couchdb_query = $("#couchdb_query").val();
    }

    /**
     * Tableau Fields On-Change Event Handler
     */
    function handler_tableauColumnsOnChange() {

        // Clear tableau columns
        tableau_columns = [];
        tableau_column_paths = [];

        // Split columns separated by comma
        const columns = $("#tableau_columns").val().split(',');

        // Loop through columns and add valid columns at the same time
        columns.forEach((column) => {
            const [path, type] = column.trim().split(':').map((i) => i.trim());
            const id = path.split('.')[path.split('.').length - 1];
            if (typeof tableau.dataTypeEnum[type] === "undefined") {
                alert(`Data type: "${dataType}" is invalid. Please use the available data types listed.`);
                return;
            }
            const dataType = tableau.dataTypeEnum[type];
            tableau_columns.push({ id, dataType });
            tableau_column_paths.push(path);
        });
    }

    /**
     * Tableau Root Document On-Change
     */
    function handler_tableauRootDocumentOnChange() {
        tableau_root_document = $('#tableau_root_document').is(':checked');
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
