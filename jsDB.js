class jsDB{
    #DB_NAME = 'MyDB';
    #DB_VERSION = 1;    
    constructor (model){        
        if (!window.indexedDB) {
            throw "IndexedDB not compatible!"
        }
        else {
            if (model.name){                
                this.#DB_NAME = model.name;
                this.#DB_VERSION = model.version;
                let dbconnect = window.indexedDB.open(this.#DB_NAME, this.#DB_VERSION);
                dbconnect.onblocked = function (ev){       
                    // If some other tab is loaded with the database, then it needs to be closed
                    // before we can proceed.
                    alert("Please close all other tabs with this site open!");
                };
                dbconnect.onupgradeneeded = function (ev){
                    console.info('upgrade ' + model.name + ' open DONE');
                    //create database with the model send
                    let db = ev.target.result;
                    let tables = model.tables;
                    let t = tables.length;
                    //get tables
                    if (t > 0){
                        for (let ti = 0; ti < t; ti++) {
                            const tabla = tables[ti];
                            let columns = tabla.columns;
                            let c = columns.length;
                            //get columns
                            if (c > 0){
                                let options = tabla.options;
                                let keyPath;
                                let increment;
                                if (options){
                                    if (options.keyPath){
                                        keyPath = options.keyPath;
                                        if (options.autoIncrement) increment = options.autoIncrement;                                        
                                        else increment = false;
                                    } 
                                    else {
                                        keyPath = 'ssnId';
                                        increment = true;
                                    }                                     
                                }
                                else {
                                    keyPath = 'ssnId';
                                    increment = true;
                                }
                                //add table
                                let objectStore = db.createObjectStore(tabla.name, { keyPath: keyPath, autoIncrement : increment });
                                for (let ci = 0; ci < c; ci++) {
                                    //add columns
                                    const column = columns[ci];
                                    objectStore.createIndex(column.name, column.name, { keyPath: column.keyPath, autoIncrement: column.autoIncrement, unique: column.unique });                                                                      
                                }
                            }
                        }
                    }
                    else throw "No table defined.";
                };
                dbconnect.onerror = function (e) {
                    throw e.target.error.message;  
                } 
                dbconnect.onsuccess = function (ev){
                    console.info('DB ' + model.name + ' open DONE');
                }
            }
            else throw "Please provide db model {name: 'MyDB', version: 1, tables: [{name: 'Table1', options: {keyPath : 'Id', autoIncrement: true/false}, columns: [{name: 'ColumnName', keyPath: true/false, autoIncrement: true/false, unique: true/false }]}]}"
        }
    }
    Connected(){
        return 'Connected to ' + this.#DB_NAME + ' with version ' + this.#DB_VERSION;
    }   
    Select(table, callBack) {
        let dbconnect = window.indexedDB.open(this.#DB_NAME, this.#DB_VERSION);
        dbconnect.onsuccess = function() {
            let db = this.result;
            try {
                let transaction = db.transaction(table, 'readonly');
                let store = transaction.objectStore(table);  
                let request = store.getAll();
                request.onsuccess = () => {
                    callBack(request.result)
                    db.close();
                };
                request.onerror = ev => {
                    throw "Request fail! " + ev.target.error.message;
                };                          
            } catch (error) {
                db.close();
                throw "Select fail! " + error.message;                  
            }
        }
    }
    SelectById(table, id, callBack) {
        let dbconnect = window.indexedDB.open(this.#DB_NAME, this.#DB_VERSION);
        dbconnect.onsuccess = function() {
            let db = this.result;
            try {
                let transaction = db.transaction(table, 'readonly');
                let store = transaction.objectStore(table);            
                let request = store.get(id);
                request.onerror = ev => {
                    throw "Request fail! " + ev.target.error.message;
                };
                request.onsuccess = function() {
                    if (this.result) {
                        callBack(this.result);
                    } else {
                        callBack(null);
                    }
                    db.close();
                }                
            } catch (error) {
                db.close();
                throw "SelectById fail! " + error.message;                  
            }
        }
    }   
    SelectByColumn(table, column, value, callBack) {
        let dbconnect = window.indexedDB.open(this.#DB_NAME, this.#DB_VERSION);
        dbconnect.onsuccess = function() {
            let db = this.result;
            try {
                let transaction = db.transaction(table, 'readonly');
                let store = transaction.objectStore(table);
                let index  = store.index(column);
                let request = index.get(value);
                request.onerror = ev => {
                    throw "Request fail! " + ev.target.error.message;
                };
                request.onsuccess = function() {
                    if (this.result) {
                        callBack(this.result);
                    } else {
                        callBack(null);
                    }
                    db.close();
                }                
            } catch (error) {
                db.close();
                throw "SelectByColumn fail! " + error.message;                 
            }
        }
    }
    Insert(table, data, callBack){
        let dbconnect = window.indexedDB.open(this.#DB_NAME, this.#DB_VERSION);
        dbconnect.onsuccess = function() {
            let db = this.result;
            try {
                let transaction = db.transaction(table, 'readwrite');
                let store = transaction.objectStore(table);                
                data.forEach(el => store.add(el));
                transaction.onerror = ev => {                    
                    db.close();
                    callBack({result: false, message: ev.target.error.message});
                };
                transaction.oncomplete = ev => {                    
                    db.close();
                    callBack({result: true, message: 'Insert done!'});
                };                
            } catch (error) {
                db.close();
                callBack({result: false, message: error.message});         
            }
        };        
    }    
    Update(table, data, callBack){
        let dbconnect = window.indexedDB.open(this.#DB_NAME, this.#DB_VERSION);
        dbconnect.onsuccess = function() {
            let db = this.result;
            try {
                let transaction = db.transaction(table, 'readwrite');
                let store = transaction.objectStore(table);                
                data.forEach(el => store.put(el));
                transaction.onerror = ev => {
                    db.close();
                    callBack({result: false, message: ev.target.error.message});
                };
                transaction.oncomplete = ev => {
                    db.close();
                    callBack({result: true, message: 'Update done!'});
                };                
            } catch (error) { 
                db.close();
                callBack({result: false, message: error.message});                 
            }
        };        
    }
    Delete(table, id, callBack){
        let dbconnect = window.indexedDB.open(this.#DB_NAME, this.#DB_VERSION);
        dbconnect.onsuccess = function() {
            let db = this.result;
            try {
                let transaction = db.transaction(table, 'readwrite');
                let store = transaction.objectStore(table);
                store.delete(id);
                transaction.onerror = ev => {
                    db.close();
                    callBack({result: false, message: ev.target.error.message});
                };
                transaction.onsuccess  = ev => {
                    db.close();
                    callBack({result: true, message: 'Delete done!'});
                };                
            } catch (error) {
                db.close();
                callBack({result: false, message: error.message});                 
            }
        };        
    }
    Drop(table, callBack){
        let dbconnect = window.indexedDB.open(this.#DB_NAME, this.#DB_VERSION);
        dbconnect.onsuccess = function() {
            let db = this.result;
            try {
                let transaction = db.transaction(table, 'readwrite');
                let store = transaction.objectStore(table);
                let req = store.clear();
                req.onerror = ev => {
                    db.close();
                    callBack({result: false, message: ev.target.error.message});
                };
                req.onsuccess  = ev => {
                    db.close();
                    callBack({result: true, message: 'Drop done!'});
                };
            } catch (error) {
                db.close();
                callBack({result: false, message: error.message});    
            }
        };        
    }
}

