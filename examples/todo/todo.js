"use strict";

const util    = require('util');
const Wetland = require('wetland').Wetland;
const List    = require('./entity/List');
const Todo    = require('./entity/Todo');
const wetland = new Wetland({
  entityPath: __dirname + '/entity',
  stores    : {
    defaultStore: {
      client          : 'sqlite3',
      useNullAsDefault: true,
      connection      : {filename: `./todo.sqlite`}
    }
  }
});

function todo(parameters) {
  let action = parameters[2];
  let list   = parameters[3];
  let todo   = parameters[4];

  let manager = wetland.getManager();

  if (action === 'setup') {
    return wetland.getMigrator().create().apply()
      .then(() => console.log('Tables created.'));
  }

  if (action === 'create-list') {
    let newList  = new List;
    newList.name = list;

    return manager.persist(newList).flush()
      .then(() => console.log(`New list '${list}' created.`));
  }

  if (action === 'create-full') {
    let todos    = parameters.splice(4);
    let newList  = new List;
    let newTodos = [];

    todos.forEach(todo => {
      let newTodo  = new Todo;
      newTodo.task = todo;

      newTodos.push(newTodo);
    });

    newList.name  = list;
    newList.todos = newTodos;

    return manager.persist(newList).flush().then(() => console.log('List and todos created'));
  }

  if (action === 'show-all') {
    return manager.getRepository(List).find(null, {join: ['todos']})
      .then(all => console.log(util.inspect(all, { depth: 8 })));
  }

  if (action === 'add-todo') {
    return manager.getRepository(List).findOne({name: list})
      .then(list => {
        let newTodo  = new Todo;
        newTodo.task = todo;

        list.todos.add(newTodo);

        return manager.flush();
      })
      .then(() => console.log(`Todo '${todo}' added to the list '${list}'.`));
  }

  if (action === 'done') {
    return manager.getRepository(Todo).getQueryBuilder('t')
      .update({done: true})
      .innerJoin('t.list', 'l')
      .where({'t.task': todo, 'l.name': list})
      .getQuery()
      .execute()
      .then(() => console.log(`Todo '${todo}' done is done.`));
  }

  if (action === 'remove-todo') {
    return manager.getRepository(Todo).findOne({'t.task': todo, 'list.name': list}, {alias: 't', join: ['t.list']})
      .then(todo => manager.remove(todo).flush())
      .then(() => console.log(`Todo '${todo}' removed.`));
  }

  if (action === 'delete-list') {
    return manager.getRepository(List).findOne({name: list})
      .then(list => manager.remove(list).flush())
      .then(() => console.log('List deleted.'));
  }
}

// Connections get closed on exit.
todo(process.argv).then(() => process.exit());
