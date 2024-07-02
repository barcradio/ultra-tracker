import * as React from 'react';
import Database from 'better-sqlite3';

interface User {
  id: number;
  name: string;
  email: string;
}

class UserComponent extends React.Component<{}, { users: User[] }> {
  constructor(props: {}) {
    super(props);
    this.state = { users: [] };
  }

  componentDidMount() {
    Database.get('SELECT * FROM users', (err, rows) => {
      if (err) {
        console.error(err);
        return;
      }
      this.setState({ users: rows });
    });
  }

  render() {
    return (
      <div>
        <h1>Users</h1>
        <ul>
          {this.state.users.map((user) => (
            <li key={user.id}>
              {user.name} ({user.email})
            </li>
          ))}
        </ul>
      </div>
    );
  }
}

export default UserComponent;