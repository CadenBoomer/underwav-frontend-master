import { Routes } from '@angular/router';
import { ProfileComponent as Profile } from './pages/profile/profile';
import { Home } from './pages/home/home';
import { Discover } from './pages/discover/discover';
import { Signup } from './pages/signup/signup';
import { Login } from './pages/login/login';
import { Upload } from './pages/upload/upload';
import { Dashboard} from './pages/dashboard/dashboard';
import { PublicProfile } from './pages/public-profile/public-profile';


export const routes: Routes = [
    { path: '', component: Home },
    { path: 'discover', component: Discover },
    { path: 'login', component: Login },
    { path: 'profile/:id', component: PublicProfile },
    { path: 'profile', component: Profile },
    { path: 'signup', component: Signup },
    { path: 'upload', component: Upload },
    { path: 'dashboard', component: Dashboard },];
