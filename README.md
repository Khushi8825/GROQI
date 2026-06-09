# GROQI

GROQI is a modern AI-powered chatbot application built using React and Node.js, leveraging the power of LLaMA 3.1 models through the Groq API. The platform provides fast, intelligent, and context-aware conversations through a clean and responsive chat interface.

The project demonstrates full-stack development concepts, RESTful API communication, secure backend integration, and practical usage of Large Language Models (LLMs) in real-world applications.

---
<img width="1920" height="1080" alt="image" src="https://github.com/user-attachments/assets/3bcfd44c-3a90-4bdf-9f59-a610aba43ae1" />
## Overview

GROQI enables users to interact with an AI assistant through a modern web-based chat interface. The application combines a React frontend with a Node.js and Express backend to deliver real-time conversational experiences.

The backend securely communicates with the Groq API, while the frontend focuses on providing an intuitive user experience with markdown-rendered responses, typing indicators, and responsive design.

---

## Features

### AI-Powered Conversations

* Chat with an intelligent AI assistant.
* Powered by LLaMA 3.1 models via the Groq API.
* Fast and context-aware responses.

### Real-Time Messaging

* Instant communication between users and the AI.
* Smooth chat experience with minimal latency.
* Dynamic message rendering.

### Markdown Support

* AI responses rendered using Markdown.
* Supports headings, lists, code blocks, and formatted text.
* Improves readability of generated responses.

### Responsive User Interface

* Mobile-friendly and responsive design.
* Clean and modern chat layout.
* Optimized user experience across devices.

### Enhanced User Experience

* Typing indicator while AI generates responses.
* Smooth UI interactions and animations.
* Organized chat history display.

### Secure Backend Integration

* API keys stored securely using environment variables.
* Backend acts as a secure middleware between the frontend and Groq API.
* Protects sensitive credentials from client exposure.

---

## Tech Stack

### Frontend

* React.js
* Tailwind CSS
* JavaScript

### Backend

* Node.js
* Express.js

### AI Integration

* Groq API
* LLaMA 3.1

### API Communication

* REST API (Fetch)

### Environment Management

* dotenv

---

## Installation

### Clone the Repository

```bash
git clone https://github.com/your-username/groqi.git
```

### Navigate to the Project Directory

```bash
cd groqi
```

### Install Dependencies

Frontend:

```bash
cd client
npm install
```

Backend:

```bash
cd server
npm install
```

### Configure Environment Variables

Create a `.env` file in the backend directory:

```env
GROQ_API_KEY=your_groq_api_key
PORT=5000
```

### Start the Application

Backend:

```bash
npm run dev
```

Frontend:

```bash
npm start
```

---

## How It Works

1. Users enter prompts through the chat interface.
2. The frontend sends requests to the Express backend.
3. The backend securely communicates with the Groq API.
4. LLaMA 3.1 processes the prompt and generates a response.
5. The response is returned to the frontend and displayed in Markdown format.
6. Users receive fast, structured, and interactive AI-generated answers.

---

## Learning Outcomes

This project helped in understanding:

* Full-stack application development
* RESTful API integration
* AI model consumption through APIs
* React state management
* Backend request handling with Express
* Secure environment variable management
* Modern chatbot UI development

---

## Future Enhancements

* Chat history persistence
* User authentication
* Multiple AI model selection
* Voice input support
* Dark/Light theme toggle
* Conversation export functionality
* Streaming AI responses
* File and image analysis support

---

## Project Status

✅ Completed Development Project

Built to explore full-stack development, API integration, and practical implementation of Large Language Models (LLMs).

---
