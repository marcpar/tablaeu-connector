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
                    let headers = { Authorization: couchdb.authorization };
                    let couchdb_url = couchdb.connectionData.couchdb.url;
                    let couchdb_database = couchdb.connectionData.couchdb.database;
                    let couchdb_designDocument = couchdb.connectionData.couchdb.designDocument;
                    let couchdb_viewName = couchdb.connectionData.couchdb.viewName;
    
                    // Set request url
                    this.url = `${couchdb_url}/${couchdb_database}/_design/${couchdb_designDocument}/_view/${couchdb_viewName}`;
    
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
                    for (var i = 0, len = rows.length; i < len; i++)couchdb_database
                    couchdb_database
                    doneCallback();
                };
    
                 /**
                  * Runs a query to couchdb server
                  */
                GetViewQuery.prototype.runQuery = function() {
                    $.get(this.url, this.parameter, this.success, 'json');
                };
    
                 return new GetViewQuery(couchdb);
            },
            documentQuery: (couchdb) => {

                /**
                 * GetDocumentQuery constructor
                 *
                 * @param {CouchDB} couchdb 
                 */
                 function GetDocumentQuery(couchdb) {
                    let headers = { Authorization: couchdb.authorization };
                    let couchdb_url = couchdb.connectionData.couchdb.url;
                    let couchdb_database = couchdb.connectionData.couchdb.database;
    
                    // Set request url
                    this.url = `${couchdb_url}/${couchdb_database}/_all_docs`;
    
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
                GetDocumentQuery.prototype.success = function(resp) {
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
                };
    
                 /**
                  * Runs a query to couchdb server
                  */
                GetDocumentQuery.prototype.runQuery = function() {
                    $.get(this.url, this.parameter, this.success, 'json');
                };
    
                 return new GetDocumentQuery(couchdb);
            }
        };

        let couchdb = (() => {
            /**
             * CouchDB constructor
             */
            function Couchdb() { this.connectionData = JSON.parse(tableau.connectionData) };

            /**
             * Sets up the authorization header to create an authenticated request in CouchDB
             *
             * @param {string} username CouchDB Username
             * @param {string} password CouchDB Password
             * @returns {CouchDB} This instance
             */
            Couchdb.prototype.login = function(username, password) {
                this.authorization = `Basic ${btoa(`${username}:${password}`)}`;
                return this;
            };

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
                return couchdbQuery[this.connectionData.couchdb.type]({
                    connectionData: this.connectionData,
                    authorization: this.authorization
                });
            };

            return new Couchdb();
        })();

        couchdb
            .login('admin', 'adminpogi')
            .runQuery(couchdb.getQuery());
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
                    // @todo: Consider making it dynamic
                    columns: [{
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
                },

                // CouchDB Setup
                couchdb: {
                    type: $("#couchdb_type").val(),
                    url: $("#couchdb_url").val(),
                    database: $("#couchdb_database").val(),
                    designDocument: $("#couchdb_designDocument").val(),
                    viewName: $("#couchdb_viewName").val(),
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
     * Selects CouchDB View
     * 
     * @param {string} view 
     */
    function selectCouchdbView(view) {
        couchdb_view = view;
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
        })
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
