import { UserProfileClient } from './UserProfileClient';

export default function UserProfilePage() {
  return (
    <div className="page user-profile-page">
      <div className="page__header">
        <div>
          <h1 className="page__title">User Profile</h1>
          <p className="page__desc">View and update your profile details synced from DynamoDB.</p>
        </div>
      </div>

      <UserProfileClient />
    </div>
  );
}
