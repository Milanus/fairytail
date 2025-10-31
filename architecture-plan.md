# Fairy Tale Storytelling Platform - Architecture Plan

## Core Features

### User Features
- User registration and authentication
- Browse and read published fairy tales
- Submit own fairy tales with title, content, and tags
- Like and comment on fairy tales
- Search and filter fairy tales by title, author, tags, or date
- Save favorite fairy tales
- User profile with submitted stories and activity

### Admin Features
- Review and approve submitted fairy tales
- Moderate comments
- Manage user accounts
- Featured stories management

## Database Schema

### Users Table
- id (UUID)
- username (string, unique)
- email (string, unique)
- password_hash (string)
- created_at (timestamp)
- updated_at (timestamp)
- is_admin (boolean)
- profile_image_url (string, optional)

### Fairy Tales Table
- id (UUID)
- title (string)
- content (text)
- author_id (foreign key to Users)
- status (enum: draft, pending, published, rejected)
- created_at (timestamp)
- updated_at (timestamp)
- published_at (timestamp, optional)
- tags (array of strings)
- likes_count (integer, default: 0)
- views_count (integer, default: 0)

### Comments Table
- id (UUID)
- fairy_tale_id (foreign key to Fairy Tales)
- author_id (foreign key to Users)
- content (text)
- created_at (timestamp)
- updated_at (timestamp)

### Likes Table
- id (UUID)
- user_id (foreign key to Users)
- fairy_tale_id (foreign key to Fairy Tales)
- created_at (timestamp)

### Tags Table
- id (UUID)
- name (string, unique)
- created_at (timestamp)

### User_Favorites Table
- id (UUID)
- user_id (foreign key to Users)
- fairy_tale_id (foreign key to Fairy Tales)
- created_at (timestamp)

## User Interface Components

### Public Pages
- Home page with featured stories
- Fairy tale listing page with search/filter
- Individual fairy tale page
- User profile page (public view)
- About page

### Authenticated User Pages
- Dashboard with user's stories
- Story submission form
- User profile management
- Favorite stories page

### Admin Pages
- Admin dashboard
- Story review queue
- User management
- Comment moderation

## Navigation Structure
- Main navigation: Home, Browse, Submit Story, About
- User menu: Profile, Dashboard, Favorites, Logout
- Admin menu: Dashboard, Review Queue, User Management

## Authentication and Authorization
- JWT-based authentication
- Role-based access control (user, admin)
- Password reset functionality
- Email verification for new accounts

## Content Management Features
- Rich text editor for story submission
- Draft saving functionality
- Story preview before submission
- Tagging system for categorization
- Content moderation workflow

## Search and Filtering Capabilities
- Full-text search on title and content
- Filter by tags
- Sort by date, popularity (likes), or views
- Advanced search with multiple criteria

## Responsive Layout
- Mobile-first design approach
- Tablet-optimized layouts
- Desktop-enhanced features
- Accessible design following WCAG guidelines

## Technical Architecture

### Frontend
- Next.js 15 with App Router
- Tailwind CSS for styling
- React components with TypeScript
- Responsive design with mobile-first approach

### Backend
- Next.js API routes for server-side functionality
- PostgreSQL database for data storage
- Redis for caching and session management
- Cloud storage for images (if needed)

### Authentication
- NextAuth.js for authentication
- JWT tokens for session management
- Password hashing with bcrypt

### Deployment
- Vercel for frontend deployment
- Database hosting (e.g., Supabase, PlanetScale, or similar)
- CDN for static assets

## Architectural Diagram

```mermaid
graph TD
    A[User Browser] --> B[Next.js Frontend]
    B --> C[Next.js API Routes]
    C --> D[(PostgreSQL Database)]
    C --> E[NextAuth.js]
    C --> F[Cloud Storage]
    B --> G[Tailwind CSS]
    H[Admin User] --> B