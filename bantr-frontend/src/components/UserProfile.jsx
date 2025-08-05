import React, { useState, useEffect } from 'react';
import apiService from '../services/api';

const UserProfile = () => {
  const [user, setUser] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      setLoading(true);
      
      const [profileData, postsData] = await Promise.all([
        apiService.getUserProfile(),
        apiService.getUserPosts()
      ]);
      
      setUser(profileData.user);
      setPosts(postsData.posts);
    } catch (error) {
      setError(error.message);
      console.error('Error fetching user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    apiService.logout();
    window.location.href = '/login';
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '50px' }}>Loading...</div>;
  }

  if (error) {
    return (
      <div style={{ textAlign: 'center', padding: '50px', color: 'red' }}>
        <p>Error: {error}</p>
        <button onClick={fetchUserData}>Retry</button>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '30px',
        padding: '20px',
        border: '1px solid #ddd',
        borderRadius: '8px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <img 
            src={user?.picture} 
            alt={user?.name}
            style={{ 
              width: '60px', 
              height: '60px', 
              borderRadius: '50%' 
            }}
          />
          <div>
            <h2 style={{ margin: '0 0 5px 0' }}>{user?.name}</h2>
            <p style={{ margin: 0, color: '#666' }}>{user?.email}</p>
          </div>
        </div>
        <button 
          onClick={handleLogout}
          style={{
            padding: '10px 20px',
            backgroundColor: '#dc3545',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Logout
        </button>
      </div>

      <div>
        <h3>Your Posts ({posts.length})</h3>
        {posts.length === 0 ? (
          <p style={{ color: '#666', fontStyle: 'italic' }}>No posts yet.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            {posts.map((post) => (
              <div 
                key={post.id}
                style={{
                  padding: '15px',
                  border: '1px solid #ddd',
                  borderRadius: '8px',
                  backgroundColor: '#f9f9f9'
                }}
              >
                <h4 style={{ margin: '0 0 10px 0' }}>{post.title}</h4>
                <p style={{ margin: 0, color: '#333' }}>{post.content}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default UserProfile;
