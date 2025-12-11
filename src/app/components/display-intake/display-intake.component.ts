import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError } from 'rxjs/operators';
import { of } from 'rxjs';
import { CommonModule } from '@angular/common';

interface SegmentationResult {
  segmented_image_url: string;
  num_classes: number;
  class_names: string[];
}

interface ApiResult {
  status: string;
  results: {
    before: SegmentationResult;
    after: SegmentationResult;
  };
}

@Component({
  selector: 'app-display-intake',
  imports: [CommonModule],
  templateUrl: './display-intake.component.html',
  styleUrls: ['./display-intake.component.scss']
})
export class DisplayIntakeComponent implements OnInit {

  beforeResult!: SegmentationResult | null;
  afterResult!: SegmentationResult | null;
  loading: boolean = true;
  error: string | null = null;

  private apiUrl = 'https://h3vkhzth-8000.asse.devtunnels.ms/api/segment/results/';

  constructor(private http: HttpClient) { }

  ngOnInit(): void {
    this.fetchSegmentationResults();
    console.log(this.fetchSegmentationResults());
  }

  fetchSegmentationResults(): void {
    this.http.get<ApiResult>(this.apiUrl)
      .pipe(
        catchError(err => {
          this.error = 'Failed to fetch segmentation results.';
          this.loading = false;
          return of(null);
        })
      )
      .subscribe((data) => {
        if (data && data.status === 'success') {
          this.beforeResult = data.results.before;
          this.afterResult = data.results.after;
        } else {
          this.error = 'No results found.';
        }
        this.loading = false;
      });
  }
}
