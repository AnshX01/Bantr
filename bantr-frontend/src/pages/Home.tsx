import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

function Home() {
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
    }
  }, [navigate]);

  return (
    <div style={{ textAlign: "center", paddingTop: "50px" }}>
      <h1>Welcome to Bantr</h1>
      <p>Your private video meeting platform</p>
    </div>
  );
}

export default Home;
