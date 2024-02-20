import {Routes} from '@angular/router';
import {ForecastComponent} from "./modules/forecast/forecast.component";

export const routes: Routes = [
  {
    path: '**',
    redirectTo: 'forecast'
  },
  {
    path: 'forecast',
    component: ForecastComponent
  }
];
