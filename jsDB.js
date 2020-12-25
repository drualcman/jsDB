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
                dbconnect.onblocked = ev => {       
                    // If some other tab is loaded with the database, then it needs to be closed
                    // before we can proceed.
                    alert("Please close all other tabs with this site open!");
                };
                dbconnect.onupgradeneeded = ev => {
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
                dbconnect.onerror = e => {
                    throw e.target.error.message;  
                } 
                dbconnect.onsuccess = () => {
                    console.info('DB ' + model.name + ' open DONE');
                }
            }
            else throw "Please provide db model {name: 'MyDB', version: 1, tables: [{name: 'Table1', options: {keyPath : 'Id', autoIncrement: true/false}, columns: [{name: 'ColumnName', keyPath: true/false, autoIncrement: true/false, unique: true/false }]}]}"
        }
    }         
    #SetResult(r, m) {    
        return {result: r, message: m};
    }  
    /**
     * Return true or false if the key exist into the object send
     * @param {object} obj 
     * @param {string} val 
     */
    #HasKeyPath(obj, val) {
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
    #MergeObjects(obj1, obj2) {
        var obj3 = {};
        var obj4 = {};
        //set the 2 objects exactly with the same properties
        for(let k1 in obj1) {
            if (Object.hasOwnProperty.call(obj1, k1)) {
                const e1 = obj1[k1];
                for(let k2 in obj2) { 
                    if (k1 == k2) obj3[k2] = obj2[k2];
                    else continue;                                        
                }                
            }
        }
        //set the values equal on the merged object
        for (let attrname in obj1) { obj4[attrname] = obj1[attrname]; }
        for (let attrname1 in obj3) { obj4[attrname1] = obj3[attrname1]; }
        return obj4;
    }
    /**
     * Check if the data send match with the table definition
     * @param {object} model 
     * @param {JSON} d 
     * @param {bool} keypath forse to have a keypath on the default json objet
     * @param {function} callBack 
     * @param {function} method 
     */
    #CheckTable(model, d, keypath, callBack, method){        
        if (model){
            let canContinue;
            let defaultObj = '{';       //to create a default json for the table
            //compare object receive with table definition
            //check primary key
            if (model.options.keyPath && model.options.autoIncrement && model.options.autoIncrement == false){
                //have a primary key required
                if (this.#HasKeyPath(d, model.options.keyPath)) canContinue = true;
                else{
                    if (keypath) defaultObj += '"' + model.options.keyPath + '": null,';
                    canContinue = false;                
                    if (callBack) callBack(this.#SetResult(false, model.options.keyPath + " is required and can't be found."));
                } 
            }    
            else {
                if (keypath && model.options.keyPath) defaultObj += '"' + model.options.keyPath + '": null,';
                canContinue = true;
            }
            //sure the object received have all the keys to send               
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
                let sender = this;
                for (const key in d) {
                    if (Object.hasOwnProperty.call(d, key)) {
                        const element = d[key];                        
                        //recovery the original object to fill all the data must be updated
                        if (element[model.options.keyPath]){
                            sender.SelectId(model.name, element[model.options.keyPath], function (result) {
                                if (result){
                                    let original = sender.#MergeObjects(obj, result);
                                    let send = sender.#MergeObjects(original, element);
                                    data.push(send);
                                }
                                else {
                                    data.push(sender.#MergeObjects(obj, element));
                                }
                            });
                        }
                        else {
                            data.push(sender.#MergeObjects(obj, element));
                        }
                    }
                }
                //wait a bit to ensure the transaction is completed
                setTimeout(() => {
                    method(data);   
                }, 150 * d.length);
            }
            else method(null);
        }
        else {
            if (callBack) callBack(this.#SetResult(false, "Model can't be null."));
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
                request.onerror = ev => {
                    db.close();
                    throw "Request fail! " + ev.target.error.message;
                };                          
                request.onsuccess = () => {
                    if (callBack) callBack(request.result)
                    db.close();
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
                    db.close();
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
                    db.close();
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
        this.#CheckTable(this.#MODELS.find(el=> el.name = table), data, false, callBack, function (obj) {
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
            else callBack(this.#SetResult(false, responseMessage));
        });
    } 
    Update(table, data, callBack){
        let sender = this;
        sender.#CheckTable(sender.#MODELS.find(el=> el.name = table), data, true, callBack, function (obj) {
            if (obj){
                let dbconnect = window.indexedDB.open(sender.#DB_NAME, sender.#DB_VERSION);
                dbconnect.onsuccess = function() {
                    let db = this.result;
                    try {
                        let transaction = db.transaction(table, 'readwrite');
                        let store = transaction.objectStore(table); 
                        obj.forEach(el => store.put(el));
                        transaction.onerror = ev => {
                            if (callBack) callBack(sender.#SetResult(false, ev.target.error.message));
                        };
                        transaction.oncomplete = ev => {
                            if (callBack) callBack(sender.#SetResult(true,'Update done!'));
                        };         
                    } catch (error) { 
                        if (callBack) callBack(sender.#SetResult(false,error.message));              
                        db.close();
                    }
                };  
            }
            else callBack(sender.#SetResult(false, responseMessage));
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


