/* eslint-disable jsx-a11y/label-has-associated-control */
/* eslint-disable jsx-a11y/control-has-associated-label */
import React, { useEffect, useRef, useState } from 'react';
import { UserWarning } from './UserWarning';
import * as todoService from './api/todos';
import { Todo } from './types/Todo';
import classNames from 'classnames';
import { TodoList } from './components/TodoList';
import { TodoItem } from './components/TodoItem';
import { NewTodo } from './types/NewTodo';

const ERROR_MESSAGES = {
  load: 'Unable to load todos',
  title: 'Title should not be empty',
  add: 'Unable to add a todo',
  delete: 'Unable to delete a todo',
  update: 'Unable to update a todo',
};

export const App: React.FC = () => {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [title, setTitle] = useState('');
  const [status, setStatus] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [tempTodo, setTempTodo] = useState<Todo | null>(null);
  const [loadingIds, setLoadingIds] = useState<number[]>([]);

  const normalizedTitle = title.trim();
  const isAllCompleted = todos.every(todo => todo.completed);
  const hasCompleted = todos.some(todo => todo.completed);
  const filteringByStatus = todos.filter(todo => {
    if (status === 'active') {
      return !todo.completed;
    }

    if (status === 'completed') {
      return todo.completed;
    }

    return true;
  });
  const newTodo = (todoTitle: string): NewTodo => {
    return {
      userId: todoService.USER_ID,
      title: todoTitle,
      completed: false,
    };
  };

  /* get todos */
  useEffect(() => {
    todoService
      .getTodos()
      .then(setTodos)
      .catch(() => setErrorMessage(ERROR_MESSAGES.load));
  }, []);

  /* errors */
  useEffect(() => {
    if (!errorMessage) {
      return;
    }

    const timer = setTimeout(() => setErrorMessage(null), 3000);

    return () => clearTimeout(timer);
  }, [errorMessage]);

  /* input focus */
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, [tempTodo]);

  /* deleting */
  function deleteTodo(todoId: number) {
    setLoadingIds(prev => [...prev, todoId]);
    todoService
      .deleteTodo(todoId)
      .then(() => setTodos(prev => prev.filter(todo => todo.id !== todoId)))
      .catch(() => {
        setErrorMessage(ERROR_MESSAGES.delete);
        setTempTodo(null);
      })
      .finally(() => {
        setLoadingIds(loadingIds.filter(id => id !== todoId));
        inputRef?.current?.focus();
      });
  }

  const clearCompleted = () => {
    todos.filter(todo => todo.completed).forEach(todo => deleteTodo(todo.id));
  };

  /* toggle */
  const onToggle = (todo: Todo) => {
    setLoadingIds(prev => [...prev, todo.id]);
    const toggled = { ...todo, completed: !todo.completed };

    todoService
      .updateTodo(toggled)
      .then(toggledTodo => {
        setTodos(prev =>
          prev.map(t => (t.id === toggledTodo.id ? toggledTodo : t)),
        );
      })
      .catch(() => setErrorMessage(ERROR_MESSAGES.update))
      .finally(() => setLoadingIds(prev => prev.filter(id => id !== todo.id)));
  };

  const toggleAll = () => {
    if (hasCompleted && !isAllCompleted) {
      return todos.filter(todo => !todo.completed).forEach(t => onToggle(t));
    }

    return todos.forEach(todo => onToggle(todo));
  };

  const onUpdate = (updatedTodo: Todo) => {
    setLoadingIds(prev => [...prev, updatedTodo.id]);

    return todoService
      .updateTodo(updatedTodo)
      .then(() =>
        setTodos(prev =>
          prev.map(t => (t.id === updatedTodo.id ? updatedTodo : t)),
        ),
      )
      .catch(() => {
        setErrorMessage(ERROR_MESSAGES.update);
        throw new Error();
      })
      .finally(() =>
        setLoadingIds(prev => prev.filter(id => id !== updatedTodo.id)),
      );
  };

  if (!todoService.USER_ID) {
    return <UserWarning />;
  }

  return (
    <div className="todoapp">
      <h1 className="todoapp__title">todos</h1>

      <div className="todoapp__content">
        <header className="todoapp__header">
          {/* this button should have `active` class only if all todos are completed */}
          {todos.length > 0 && (
            <button
              type="button"
              className={classNames('todoapp__toggle-all', {
                active: isAllCompleted,
              })}
              data-cy="ToggleAllButton"
              onClick={toggleAll}
            />
          )}

          {/* Add a todo on form submit */}
          <form
            onSubmit={e => {
              e.preventDefault();

              if (!normalizedTitle) {
                setErrorMessage(ERROR_MESSAGES.title);

                return;
              }

              setTempTodo({
                ...newTodo(normalizedTitle),
                id: 0,
              });
              todoService
                .addTodo(newTodo(normalizedTitle))
                .then(addedTodo => {
                  setTodos([...todos, addedTodo]);
                  setTitle('');
                  setTempTodo(null);
                })
                .catch(() => {
                  setErrorMessage(ERROR_MESSAGES.add);
                  setTempTodo(null);
                });
            }}
          >
            <input
              data-cy="NewTodoField"
              type="text"
              className="todoapp__new-todo"
              placeholder="What needs to be done?"
              value={title}
              onChange={e => setTitle(e.target.value)}
              ref={inputRef}
              disabled={tempTodo !== null}
            />
          </form>
        </header>

        <TodoList
          todos={filteringByStatus}
          onDelete={deleteTodo}
          loadingIds={loadingIds}
          onChecked={onToggle}
          onChange={onUpdate}
        />

        {tempTodo && (
          <TodoItem
            todo={tempTodo}
            isLoading={true}
            deleteItem={() => {}}
            isComplete={() => {}}
            isChange={() => Promise.resolve()}
          />
        )}

        {/* Hide the footer if there are no todos */}
        {todos.length > 0 && (
          <footer className="todoapp__footer" data-cy="Footer">
            <span className="todo-count" data-cy="TodosCounter">
              {todos.filter(todo => !todo.completed).length} items left
            </span>

            {/* Active link should have the 'selected' class */}
            <nav className="filter" data-cy="Filter">
              <a
                href="#/"
                className={classNames('filter__link', {
                  selected: status === '',
                })}
                data-cy="FilterLinkAll"
                onClick={() => setStatus('')}
              >
                All
              </a>

              <a
                href="#/active"
                className={classNames('filter__link', {
                  selected: status === 'active',
                })}
                data-cy="FilterLinkActive"
                onClick={() => setStatus('active')}
              >
                Active
              </a>

              <a
                href="#/completed"
                className={classNames('filter__link', {
                  selected: status === 'completed',
                })}
                data-cy="FilterLinkCompleted"
                onClick={() => setStatus('completed')}
              >
                Completed
              </a>
            </nav>

            {/* this button should be disabled if there are no completed todos */}
            <button
              type="button"
              className="todoapp__clear-completed"
              data-cy="ClearCompletedButton"
              onClick={clearCompleted}
              disabled={!hasCompleted}
            >
              Clear completed
            </button>
          </footer>
        )}
      </div>

      <div
        data-cy="ErrorNotification"
        className={classNames(
          'notification is-danger is-light has-text-weight-normal',
          {
            hidden: !errorMessage,
          },
        )}
      >
        <button
          data-cy="HideErrorButton"
          type="button"
          className="delete"
          onClick={() => setErrorMessage(null)}
        />
        {/* show only one message at a time */}
        {errorMessage}
      </div>
    </div>
  );
};
