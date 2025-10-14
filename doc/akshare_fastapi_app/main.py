
import pandas as pd
from fastapi import FastAPI, Request, APIRouter
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.templating import Jinja2Templates
import akshare as ak
import io

app = FastAPI()
templates = Jinja2Templates(directory="templates")

# Correct the path to the Excel file
excel_path = 'D:\\Code\\codex-react-native-stock\\doc\\AkShare.xlsx'

def get_functions():
    try:
        df = pd.read_excel(excel_path)
        # Replace NaN with None for easier handling in templates
        df = df.where(pd.notnull(df), None)
        # Convert to a list of dictionaries for easier use
        return df.to_dict('records')
    except FileNotFoundError:
        return []

functions_list = get_functions()

@app.get("/", response_class=HTMLResponse)
async def read_root(request: Request):
    return templates.TemplateResponse("index.html", {"request": request, "functions": functions_list})

@app.get("/api/functions")
async def get_all_functions():
    """Returns the list of all available functions and their parameters."""
    return {"functions": functions_list}

@app.get("/api/call/{function_name}")
async def call_akshare_function(function_name: str, request: Request):
    function_name = function_name.strip()
    print(f"Received request for function: '{function_name}'")

    if not hasattr(ak, function_name):
        return JSONResponse(status_code=404, content={"error": f"Function '{function_name}' not found in AkShare library"})

    params = dict(request.query_params)
    print(f"With parameters: {params}")

    try:
        func = getattr(ak, function_name)
        
        # Attempt to call the function with parameters
        data = func(**params)

        # Process the data
        if isinstance(data, pd.DataFrame):
            # Convert DataFrame to JSON, handling potential date formats
            return JSONResponse(content=data.to_dict('records'))
        else:
            # For other data types, wrap them in a standard response
            return JSONResponse(content={"data": data})

    except Exception as e:
        # Catch any exception during the function call or data processing
        error_message = f"Error calling function '{function_name}' with params {params}: {type(e).__name__} - {str(e)}"
        print(error_message) # Log the detailed error to the console
        return JSONResponse(status_code=500, content={"error": error_message})

