# jsDB
Try to create a class library to manage easier the indexedDb from a browsers.

# Model Definition

En the model definition we must be so send:

Database name
Database version
Array with tables

For the tables definitoin we must be to send

Table name are requiered
Table options, indicate the keyPath and if it's auto incremental or not, options is not required.
Table columns, indicate name, if it's used like a keyPath, if it's autoincremental, and if it's unique, only name must be required.

```
var model = {
    name: 'MyDB', 
    version: 1, 
    tables: [
        {name: 'Usuarios',
         options: {keyPath : 'ssn', autoIncrement: true}, 
         columns: [
                    {name: 'Id', keyPath: true, autoIncrement: false, unique: true }, 
                    {name: 'Email', keyPath: true, autoIncrement: false, unique: true }, 
                    {name: 'Name', autoIncrement: false, unique: false }
                ]
        },
        {name: 'Ministros', 
         options: {keyPath : 'ssn', autoIncrement: true}, 
         columns: [
                    {name: 'Id', keyPath: true, autoIncrement: false, unique: true }, 
                    {name: 'Email', keyPath: true, autoIncrement: false, unique: true }, 
                    {name: 'Name', autoIncrement: false, unique: false }
                ]
        }
    ]
}
```

# Methods

Connected(): return database name and version
Select(table, callBack): return all array json data into the table
SelectId(table, id, callBack): return json data from the table with id send. Id must be the keyPath
SelectWhere(table, column, value, callBack): return json data from the table and column with the value send
Insert(table, data, callBack): insert data into a table. data always must be contect all the columns from the table definition
Update(table, data, callBack): update data into a table. data always must be contect all the columns from the table definition, is don't exist then insert the data into the table
Delete(table, id, callBack): delete row from the table with the id send
Drop(table, callBack): drop the full table

# Return object

For the methods insert, update, delete and drop the response json opject definition is

```
{
    result: true/false,
    message: 'action message or error messge'
}
```