class jsDB{
    #DB_NAME = 'MyDB';      //db name
    #DB_VERSION = 1;        //db version
    #MODELS;                //Table model definitions
    constructor (model){        
        if (!window.indexedDB) {
            throw "IndexedDB not compatible!"
        }
        else {
            if (model.name){    
                this.#MODELS  = model.tables;            
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
    static #SetResult(r, m) {    
        return {result: r, message: m};
    }  
    /**
     * Return true or false if the key exist into the object send
     * @param {object} obj 
     * @param {string} val 
     */
    static #getKeys(obj, val) {
        let found = false;
        for (const key in obj) {
            if (Object.hasOwnProperty.call(obj, key)) {
                const element = obj[key];
                for (var i in element) {   
                    if (i == val) found = true;
                }
            }
        }        
        return found;
    } 
    /**
     * Merge all properties from 2 objects. Can't have object inside object.
     * @param {object} obj1 
     * @param {object} obj2 
     */
    static #MergeObjects(obj1, obj2) {
        var obj3 = {};
        for (var attrname in obj1) { obj3[attrname] = obj1[attrname]; }
        for (var attrname1 in obj2) { obj3[attrname1] = obj2[attrname1]; }
        return obj3;
    }
    /**
     * Check if the data send match with the table definition
     * @param {object} model 
     * @param {JSON} d 
     * @param {function} callBack 
     * @param {function} method 
     */
    static #CheckTable(model, d, callBack, method){        
        if (model){
            let canContinue;
            let defaultObj = '{';       //to create a default json for the table
            //compare object receive with table definition
            //check primary key
            if (model.options.keyPath && model.options.autoIncrement && model.options.autoIncrement == false){
                //have a primary key required
                defaultObj += '"' + model.options.keyPath + '": null,';
                if (jsDB.#getKeys(d, model.options.keyPath)) canContinue = true;
                else{
                    canContinue = false;                
                    if (callBack) callBack(jsDB.#SetResult(false, model.options.keyPath + " is required and can't be found."));
                } 
            }    
            else {
                canContinue = true;
            }
            //sure the objebt received have all the keys to send               
            if (canContinue){
                let data = [];
                //create a default json object for the table
                let c = model.columns.length;
                for (let index = 0; index < c; index++) {
                    defaultObj += '"' +model.columns[index].name + '": null,';
                }
                defaultObj = defaultObj.substring(0,defaultObj.length-1);
                defaultObj += '}';
                let obj = JSON.parse(defaultObj);
                for (const key in d) {
                    if (Object.hasOwnProperty.call(d, key)) {
                        const element = d[key];
                        data.push(jsDB.#MergeObjects(obj, element))
                    }
                }
                method(data);
            }
            else method(null);
        }
        else {
            if (callBack) callBack(jsDB.#SetResult(false, "Model can't be null."));
            return null;
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
                    if (callBack) callBack(request.result)
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
    SelectId(table, id, callBack) {
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
                        if (callBack) callBack(this.result);
                    } else {
                        if (callBack) callBack(null);
                    }
                    db.close();
                }                
            } catch (error) {
                db.close();
                throw "SelectById fail! " + error.message;                  
            }
        }
    }   
    SelectWhere(table, column, value, callBack) {
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
                        if (callBack) callBack(this.result);
                    } else {
                        if (callBack) callBack(null);
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
        let dbName = this.#DB_NAME;
        let dbVersion = this.#DB_VERSION;
        jsDB.#CheckTable(this.#MODELS.find(el=> el.name = table), data, callBack, function (obj) {
            console.log(obj);
            if (obj){
                let dbconnect = window.indexedDB.open(dbName, dbVersion);
                dbconnect.onsuccess = function() {
                    let db = this.result;
                    try {
                        let transaction = db.transaction(table, 'readwrite');
                        let store = transaction.objectStore(table);                
                        obj.forEach(el => store.add(el));
                        transaction.onerror = ev => {                    
                            db.close();
                            if (callBack) callBack({result: false, message: ev.target.error.message});
                        };
                        transaction.oncomplete = ev => {                    
                            db.close();
                            if (callBack) callBack({result: true, message: 'Insert done!'});
                        };                
                    } catch (error) {
                        db.close();
                        if (callBack) callBack({result: false, message: error.message});         
                    }
                };   
            }
            else callBack(jsDB.#SetResult(false, responseMessage));
        });
    } 
    Update(table, data, callBack){
        let dbName = this.#DB_NAME;
        let dbVersion = this.#DB_VERSION;
        jsDB.#CheckTable(this.#MODELS.find(el=> el.name = table), data, callBack, function (obj) {
            if (obj){
                let dbconnect = window.indexedDB.open(dbName, dbVersion);
                dbconnect.onsuccess = function() {
                    let db = this.result;
                    try {
                        let transaction = db.transaction(table, 'readwrite');
                        let store = transaction.objectStore(table);                
                        obj.forEach(el => store.put(el));
                        transaction.onerror = ev => {
                            if (callBack) callBack(jsDB.#SetResult(false, ev.target.error.message));
                            db.close();                    
                        };
                        transaction.oncomplete = ev => {
                            if (callBack) callBack(jsDB.#SetResult(true,'Update done!'));
                            db.close();                        
                        };                
                    } catch (error) { 
                        if (callBack) callBack(jsDB.#SetResult(false,error.message));              
                        db.close();
                    }
                };  
            }
            else callBack(jsDB.#SetResult(false, responseMessage));
        });
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
                    if (callBack) callBack({result: false, message: ev.target.error.message});
                };
                transaction.onsuccess  = () => {
                    db.close();
                    if (callBack) callBack({result: true, message: 'Delete done!'});
                };                
            } catch (error) {
                db.close();
                if (callBack) callBack({result: false, message: error.message});                 
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
                    if (callBack) callBack({result: false, message: ev.target.error.message});
                };
                req.onsuccess  = () => {
                    db.close();
                    if (callBack) callBack({result: true, message: 'Drop done!'});
                };
            } catch (error) {
                db.close();
                if (callBack) callBack({result: false, message: error.message});    
            }
        };        
    }
}


