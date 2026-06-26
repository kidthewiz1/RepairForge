# Auth-Gated App Testing Playbook (Emergent Google Auth)

## Step 1: Create Test User & Session
```
mongosh --eval "
use('test_database');
var userId = 'test-user-' + Date.now();
var sessionToken = 'test_session_' + Date.now();
db.users.insertOne({
  user_id: userId,
  email: 'test.user.' + Date.now() + '@example.com',
  name: 'Test User',
  picture: 'https://via.placeholder.com/150',
  created_at: new Date()
});
db.user_sessions.insertOne({
  user_id: userId,
  session_token: sessionToken,
  expires_at: new Date(Date.now() + 7*24*60*60*1000).toISOString(),
  created_at: new Date()
});
print('Session token: ' + sessionToken);
print('User ID: ' + userId);
"
```

## Step 2: Test Backend API
```
curl -X GET "$URL/api/auth/me" -H "Authorization: Bearer YOUR_SESSION_TOKEN"
curl -X GET "$URL/api/favorites" -H "Authorization: Bearer YOUR_SESSION_TOKEN"
```

## Step 3: Browser Testing - set cookie
```
await page.context.add_cookies([{
  "name": "session_token","value":"YOUR_SESSION_TOKEN",
  "domain":"<app-domain>","path":"/","httpOnly":true,"secure":true,"sameSite":"None"
}])
```

## Notes
- session_token stored in db.user_sessions with ISO expires_at
- users keyed by user_id (custom UUID), queries exclude _id
