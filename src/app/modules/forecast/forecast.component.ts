import {Component, OnInit, signal} from '@angular/core';
import {CardModule} from "primeng/card";
import {DropdownModule} from "primeng/dropdown";
import {FormsModule} from "@angular/forms";
import {lastValueFrom} from "rxjs";
import {HttpClient, HttpClientModule} from "@angular/common/http";
import {API_URL} from "../../../constants/url";
import {CalendarModule} from "primeng/calendar";
import {ImageModule} from "primeng/image";
import {ToastModule} from "primeng/toast";
import {MessageService} from "primeng/api";
import {ChartModule} from "primeng/chart";

@Component({
  selector: 'app-forecast',
  standalone: true,
  imports: [
    CardModule,
    DropdownModule,
    FormsModule,
    HttpClientModule,
    CalendarModule,
    ImageModule,
    ToastModule,
    ChartModule
  ],
  providers: [MessageService],
  templateUrl: './forecast.component.html',
  styleUrl: './forecast.component.scss'
})
export class ForecastComponent implements OnInit {
  characteristics = [
    {id: 1, name: 'Теңіз деңгейі', type: 'sea_level'},
    {id: 2, name: 'Маңызды толқынның биіктігі', type: 'wave_height'},
    {id: 3, name: 'Толқын бағыты', type: 'wave_direction'},
    {id: 4, name: 'Толқын кезеңі', type: 'wave_period'},
  ];
  selectedCharacteristic = this.characteristics[0];
  intervals = [
    {id: 1, value: '00:00'},
    {id: 7, value: '06:00'},
    {id: 13, value: '12:00'},
    {id: 19, value: '18:00'},
  ];
  selectedInterval = this.intervals[0];
  observationSpots!: { name: string, id: number }[];
  selectedSpot!: { name: string, id: number };
  selectedDate = new Date();
  photoPath = signal('');
  graph:any
  options: any;
  protected readonly API_URL = API_URL;

  constructor(private readonly http: HttpClient, private readonly messageService: MessageService) {
  }

  async ngOnInit() {
    await this.getObservationSpots();
    const documentStyle = getComputedStyle(document.documentElement);
    const textColor = documentStyle.getPropertyValue('--text-color');
    const textColorSecondary = documentStyle.getPropertyValue('--text-color-secondary');
    const surfaceBorder = documentStyle.getPropertyValue('--surface-border');

    this.graph = {
      datasets: [
        {
          label: `${this.selectedCharacteristic.name} ${this.selectedSpot.name}`,
          data: [],
          fill: false,
          borderColor: documentStyle.getPropertyValue('--blue-500'),
          tension: 0.4
        },
      ]
    };

    this.options = {
      maintainAspectRatio: false,
      aspectRatio: 0.9,
      plugins: {
        legend: {
          labels: {
            color: textColor
          }
        }
      },
      scales: {
        x: {
          ticks: {
            color: textColorSecondary
          },
          grid: {
            color: surfaceBorder,
            drawBorder: false
          }
        },
        y: {
          ticks: {
            color: textColorSecondary
          },
          grid: {
            color: surfaceBorder,
            drawBorder: false
          }
        }
      }
    };
  }

  async getObservationSpots() {
    try {
      const {data} = await lastValueFrom(this.http.get<{
        data: { name: string, id: number }[]
      }>(`${API_URL}items/observation_spots`));
      console.log(data)
      this.observationSpots = data;
      this.selectedSpot = this.observationSpots[0];
      this.messageService.add({
        severity: 'success',
        summary: 'Успешно',
        detail: 'Данные о пунктах наблюдения получены.'
      });
    } catch (err) {
      this.messageService.add({
        severity: 'error',
        summary: 'Ошибка',
        detail: 'Сервер не смог найти данные о пунктах наблюдения.'
      });
    }
  }

  async showAnalysis() {
    console.log(this.selectedCharacteristic);
    console.log(this.selectedDate);
    console.log(this.selectedInterval);
    console.log(this.selectedSpot);
    const filterValue = {
      _and: [
        {
          "observation_spot": {
            "_eq": this.selectedSpot.id
          }
        },
        {
          "folder_name": {
            "_eq": `${this.selectedDate.getFullYear()}-${(this.selectedDate.getMonth() + 1).toString().padStart(2,'0')}-${(this.selectedDate.getDate()).toString().padStart(2, '0')}`
          }
        }
      ]
    }

    const filterPhoto = {
      _and: [
        {
          "hour(date)": {
            "_eq": this.selectedInterval.id - 1,
          },
        },
        {
          "day(date)": {
            "_eq": this.selectedDate.getDate(),
          },
        },
        {
          "month(date)": {
            "_eq": this.selectedDate.getMonth() + 1
          },
        },
        {
          "year(date)": {
            "_eq": this.selectedDate.getFullYear()
          },
        },
        {
          "observation_spot": {
            "_eq": this.selectedSpot.id
          }
        },
        {
          "type": {
            "_eq": this.selectedCharacteristic.type
          }
        }
      ]
    }
    try {
      const {data: response} = await lastValueFrom(this.http.get<{
        data: any[]
      }>(`${API_URL}items/photos?filter=${JSON.stringify(filterPhoto)}&limit=100`));
      this.photoPath.set(`${API_URL}assets/${response[0]["image"]}`)
      this.messageService.add({severity: 'success', summary: 'Успешно', detail: 'Данные о фото получены.'});
    } catch (err) {
      this.messageService.add({
        severity: 'error',
        summary: 'Ошибка',
        detail: 'Сервер не смог найти фото по заданным параметрам.'
      });
    }
    try {
      let searchURL = '';
      switch (this.selectedCharacteristic['id']) {
        case 1: {
          searchURL = `${API_URL}items/sea_levels?filter=${JSON.stringify(filterValue)}`;
          break;
        }
        case 2: {
          searchURL = `${API_URL}items/wave_heights?filter=${JSON.stringify(filterValue)}`;
          break;
        }
        case 3: {
          searchURL = `${API_URL}items/wave_directions?filter=${JSON.stringify(filterValue)}`;
          break
        }
        case 4: {
          searchURL = `${API_URL}items/wave_periods?filter=${JSON.stringify(filterValue)}`
          break
        }
      }

      const {data: response} = await lastValueFrom(this.http.get<{
        data: { value: string, id: number, date: Date }[]
      }>(searchURL))
      console.log(response);
      if (!(response.length > 0)) {
        throw Error
      }
      this .graph.datasets[0].label =`${this.selectedCharacteristic.name} ${this.selectedSpot.name}`
      this.graph.datasets[0].data = response.map(item=>item.value);
      this.graph.labels = response.map(item=>item.date);
      this.graph = {...this.graph};
      console.log(this.graph.datasets[0].data)

    } catch (err) {
      console.log(err)
      this.graph.datasets[0].data =[];
      this.graph.labels = [];
      this.graph = {...this.graph};
      this.messageService.add({
        severity: 'error',
        summary: 'Ошибка',
        detail: 'Сервер не смог найти статистику по заданным параметрам.'
      });
    }

  }
}
