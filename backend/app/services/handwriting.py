import numpy as np
import pandas as pd
import joblib
import os
from typing import List, Tuple

class HandwritingService:
    def __init__(self):
        # Paths to artifacts
        base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        self.scaler_path = os.path.join(base_dir, "assets", "scaler.joblib")
        self.centroids_path = os.path.join(base_dir, "assets", "character_centroids.parquet")
        
        self.scaler = None
        self.centroids = None
        self._load_models()

    def _load_models(self):
        print(f"Loading handwriting models from: {self.scaler_path}")
        if os.path.exists(self.scaler_path) and os.path.exists(self.centroids_path):
            try:
                self.scaler = joblib.load(self.scaler_path)
                self.centroids = pd.read_parquet(self.centroids_path)
                print(f"Handwriting models loaded successfully. ({len(self.centroids)} characters)")
            except Exception as e:
                print(f"Error loading handwriting models: {e}")
        else:
            print(f"Handwriting artifacts NOT found at {self.scaler_path}. Scoring will be disabled.")

    def extract_features(self, strokes: List[List[List[float]]], grid_size=8, num_directions=8) -> List[float]:
        """
        Extract 512-dimensional directional features from strokes.
        strokes: [[[x,y], [x,y], ...], [stroke2], ...]
        """
        all_points = []
        for stroke in strokes:
            all_points.extend(stroke)
        all_points = np.array(all_points)
        
        if len(all_points) < 2:
            return [0.0] * 512
            
        # 1. Normalization
        min_coords = all_points.min(axis=0)
        max_coords = all_points.max(axis=0)
        range_coords = max_coords - min_coords
        max_range = range_coords.max()
        if max_range == 0: max_range = 1
        
        # 2. Grid-based directional accumulation
        features = np.zeros((grid_size, grid_size, num_directions))
        
        for stroke in strokes:
            if len(stroke) < 2: continue
            stroke_np = (np.array(stroke) - min_coords) / max_range * (grid_size - 1)
            
            for i in range(len(stroke_np) - 1):
                p1 = stroke_np[i]
                p2 = stroke_np[i+1]
                
                dx = p2[0] - p1[0]
                dy = p2[1] - p1[1]
                if dx == 0 and dy == 0: continue
                
                angle = np.arctan2(dy, dx)
                if angle < 0: angle += 2 * np.pi
                
                # Bin direction
                dir_idx = int((angle / (2 * np.pi) * num_directions) % num_directions)
                
                # Spatial bin (center of segment)
                mid_x = (p1[0] + p2[0]) / 2
                mid_y = (p1[1] + p2[1]) / 2
                
                grid_x = int(np.clip(mid_x, 0, grid_size - 1))
                grid_y = int(np.clip(mid_y, 0, grid_size - 1))
                
                # Weight by segment length
                weight = np.sqrt(dx**2 + dy**2)
                features[grid_y, grid_x, dir_idx] += weight
                
        # Normalize feature vector (L2 norm)
        flattened = features.flatten()
        norm = np.linalg.norm(flattened)
        if norm > 0:
            flattened = flattened / norm
            
        return flattened.tolist()

    def calculate_score(self, strokes: List[List[List[float]]], target_char: str) -> Tuple[float, str]:
        if self.scaler is None or self.centroids is None:
            return 0.0, "Model not loaded"
            
        if target_char not in self.centroids.index:
            return 0.0, f"Character '{target_char}' not in training set"
            
        # 1. Feature Extraction
        features = self.extract_features(strokes)
        
        # 2. Scaling
        features_2d = np.array(features).reshape(1, -1)
        # Create DataFrame to match feature names
        feature_cols = [f"f_{i}" for i in range(512)]
        df_input = pd.DataFrame(features_2d, columns=feature_cols)
        features_scaled = self.scaler.transform(df_input)
        
        # 3. Distance to Centroid
        centroid = self.centroids.loc[target_char].values.reshape(1, -1)
        dist = np.linalg.norm(features_scaled - centroid)
        
        # 4. Gaussian Score Mapping (stricter sigma=15.0)
        sigma = 15.0
        score = 100 * np.exp(-(dist**2) / (2 * (sigma**2)))
        
        print(f"Calculated Score: {score} (dist: {dist:.2f}, sigma: {sigma})")
        return round(float(score), 1), "Success"

handwriting_service = HandwritingService()
