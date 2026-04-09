# Underwav — Frontend

An Angular 17 music streaming platform built for independent artists.

## Tech Stack

- **Framework**: Angular 21 (standalone components)
- **Language**: TypeScript
- **State Management**: RxJS (BehaviorSubject, debounceTime) + Angular Signals
- **HTTP**: Angular HttpClient
- **Forms**: Angular FormsModule (ngModel)
- **Styling**: Bootstrap + custom CSS
- **Fonts**: Syne (headings) + DM Sans (body) via Google Fonts
- **Icons**: Bootstrap Icons

## Prerequisites

- Node.js v24+
- Angular CLI (`npm install -g @angular/cli`)
- Backend running on `http://localhost:3000`

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Run the dev server

```bash
ng serve
```

App runs on `http://localhost:4200`

## Project Structure

```
src/
  app/
    components/
      header/          — Navbar, search bar with autocomplete
      home/            — Personalized feed (logged-in users)
      discover/        — Public track discovery
      dashboard/       — User's uploads + analytics carousel
      upload/          — Track upload form
      profile/         — Edit own profile
      public-profile/  — View another user's profile
      player/          — Persistent bottom music player
      login/           — Login + forgot password
      signup/          — Register
    services/
      auth.service.ts       — Login, logout, JWT, profile CRUD
      player.service.ts     — Audio playback, queue, signals
      media.service.ts      — Track fetching, pagination
```

## Pages

| Page | Route | Auth Required |
|------|-------|---------------|
| Discover | `/discover` | No |
| Home | `/home` | Yes |
| Dashboard | `/dashboard` | Yes |
| Upload | `/upload` | Yes |
| My Profile | `/profile` | Yes |
| Public Profile | `/profile/:id` | No |
| Login | `/login` | No |
| Signup | `/signup` | No |

## Key Features

### Music Player
- Persistent bottom player across all pages
- Built on the browser's native `Audio` API
- Supports play/pause, skip, shuffle, repeat, volume, seek
- Queue management — clicking any track loads the full section as a playlist
- Expandable panel with track description, lyrics, genre tags, and artist link

### Authentication
- JWT-based authentication stored in localStorage
- Email verification on signup via tokenized link
- Forgot password flow with email reset link
- Route guards protecting logged-in pages

### Search
- Debounced search (300ms) using RxJS to avoid excessive API calls
- Autocomplete dropdown showing matching tracks and artists
- Clicking a track loads it into the player queue

### Discover Page
- Trending This Week — scored by views + likes + comments
- Most Viewed All Time
- Recent Uploads
- Browse by Genre

### Home Feed (logged-in)
- Tracks from artists you follow
- Genre Mix — tracks matching genres from your own uploads
- Suggested Artists — active artists you don't follow yet

### Dashboard
- Carousel view of your uploaded tracks
- Analytics (views, likes, comments per track)
- Edit track details, cover art, genres, lyrics, visibility
- Toggle tracks between public and private
- Comment management with like support

### Public Profiles
- View any artist's tracks, followers, following
- Follow/unfollow directly from profile
- Contact info displayed if artist makes it public

## Design

- Dark theme (`#0E0E0E` background, `#833DCE` purple accent)
- Logo designed in Inkscape — abstract audio waveform from triangles
- Consistent design language across all components using CSS variables
- OnPush change detection with manual `markForCheck()` for performance
