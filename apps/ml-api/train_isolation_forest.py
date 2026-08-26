import os
import sys
import argparse
import pandas as pd
import joblib
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler
from dotenv import load_dotenv

load_dotenv()

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

def train_model(dataset_path: str, model_out: str, scaler_out: str, n_estimators: int = 150, contamination: float = 0.05):
    print(f"Loading training dataset from: {dataset_path}")
    if not os.path.exists(dataset_path):
        print(f"Error: Dataset file not found at '{dataset_path}'")
        sys.exit(1)

    dataset = pd.read_csv(dataset_path)

    # Convert textual difficulty to numerical score if column exists
    if 'Difficulty' in dataset.columns and 'Difficulty_Score' not in dataset.columns:
        difficulty_map = {
            'Easy': 1.0, 
            'Easy-Moderate': 1.5, 
            'Moderate': 2.0, 
            'Moderate-Difficult': 2.5, 
            'Difficult': 3.0, 
            'Hard': 3.0, 
            'Expedition': 4.0
        }
        dataset['Difficulty_Score'] = dataset['Difficulty'].map(difficulty_map).fillna(2.0)
    elif 'Difficulty_Score' not in dataset.columns:
        dataset['Difficulty_Score'] = 2.0

    features = [
        'Difficulty_Score', 
        'Max_Altitude_m', 
        'Hour_of_Day', 
        'Distance_From_Trail_km', 
        'Bad_Weather_Flag'
    ]

    missing_cols = [col for col in features if col not in dataset.columns]
    if missing_cols:
        print(f"Error: Dataset is missing required feature columns: {missing_cols}")
        sys.exit(1)

    X = dataset[features]

    # Scale Features
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    # Train Isolation Forest
    print(f"Training Isolation Forest (n_estimators={n_estimators}, contamination={contamination})...")
    iso_forest = IsolationForest(
        n_estimators=n_estimators,
        contamination=contamination,
        random_state=42,
        n_jobs=-1
    )

    iso_forest.fit(X_scaled)

    os.makedirs(os.path.dirname(os.path.abspath(model_out)), exist_ok=True)
    os.makedirs(os.path.dirname(os.path.abspath(scaler_out)), exist_ok=True)

    joblib.dump(iso_forest, model_out)
    joblib.dump(scaler, scaler_out)

    print(f"Success! Model exported to '{model_out}' and Scaler to '{scaler_out}'")

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description="Train Isolation Forest Safety Model")
    parser.add_argument('--dataset', default=os.getenv('DATASET_PATH', os.path.join(BASE_DIR, 'data', 'processed_training_data.csv')))
    parser.add_argument('--model-out', default=os.getenv('MODEL_OUTPUT_PATH', os.path.join(BASE_DIR, 'models', 'isolation_forest_v1.pkl')))
    parser.add_argument('--scaler-out', default=os.getenv('SCALER_OUTPUT_PATH', os.path.join(BASE_DIR, 'models', 'feature_scaler_v1.pkl')))
    parser.add_argument('--n-estimators', type=int, default=150)
    parser.add_argument('--contamination', type=float, default=0.05)

    args = parser.parse_args()
    train_model(args.dataset, args.model_out, args.scaler_out, args.n_estimators, args.contamination)
