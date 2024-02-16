const helper = require('../helpers/common')
const employeeService = require('../services/employeeService.js')
const serviceService = require('../services/serviceService.js')
const ObjectID = require('mongoose').Types.ObjectId
const { v4: uuidv4 } = require('uuid')
const userService = require('../services/userService.js')
const { ROLE } = require('../rbac/roles')
const { canAddEmployee } = require('../rbac/permissions.js')

const getOneEmployee = (req, res) => {
    return helper.sendResponse(res, {success:true, employee:req.employee})
}

const updateEmployee = async (req, res) => {
    try {
        let employee = await employeeService.updateEmployee(req.employee.id, req.body)

        return helper.sendResponse(res, {success:true, employee})
    } catch (err) {
        helper.prettyLog(`catching ${err}`)
        helper.log2File(err.message,'error')
        return helper.sendResponse(res, 500, {message:err.message, success:false})
    }
}

const getEmployees = async (req, res) => {
    try {
        let employees = await employeeService.getEmployees({page: req.query.pageNumber, limit: req.query.rowsPerPage})

        employees = employees.docs.map(employee => {
            delete employee.user.password
            return employee
        })
        return helper.sendResponse(res, {success:true, employees: employees})
    } catch (e) {
        helper.prettyLog(`catching ${e}`)
        helper.log2File(e.message,'error')
        return helper.sendResponse(res, 500, {message:e.message, success:false})
    }
}

const addNewEmployee = async (req, res) => {
    try{
        let data = req.body

        // verify if employee account already exist
        let user = await userService.getUserByEmail(data.user.email)
        if(user) 
            return helper.sendResponse(res, 402, {success: false, message: 'Un compte utilisateur avec cet email existe déjà'})

        // get service(eg: brushing, manucure, pedicure, ...) that the new employee can do
        const serviceId = new ObjectID(req.body.serviceId)
        const service = await serviceService.getOneService(serviceId)
        if(!service)
            throw new Error(`No service has ${ serviceId } as ID`)

        // set employee user account properties
        data.user.role = ROLE.EMPLOYEE
        data.user.isVerified = true

        Object.assign(data, {service})
        delete data.serviceId

        await employeeService.addEmployee(data)

        return helper.sendResponseMsg(res, 'Employé crée avec succès ', true, 200 )
    }
    catch(e){
        helper.prettyLog(`catching ${e}`)
        helper.log2File(e.message,'error')
        return helper.sendResponse(res, 500, {message:e.message, success:false})
    }
}   
const removeEmployee = async (req, res) => {
    try{
        await employeeService.deleteEmployee(req.params.id)
        
        return helper.sendResponseMsg(res, 'Employee successfully deleted', true, 200 )
    }
    catch(e){
        console.log(e)
        // helper.prettyLog(`catching ${e}`)
        // helper.log2File(e.message,'error')
        return helper.sendResponse(res, 500, {message:e.message, success:false})
    }
}   

async function setEmployee(req, res, next){
    const employeeId = req.params.id
    req.employee = await employeeService.getOneEmployee(employeeId)
    
    if (req.employee == null)
        return helper.sendResponseMsg(res, 'Employee non trouvé', false, 404)
    
    delete req.employee.user.password
    next()
}

function authAddEmployee(req, res, next){
    if(!canAddEmployee(req.user))
        return helper.sendResponseMsg(res, "Cet utilisateur n'a pas le droit de créer un employé", false, 403)

    next()
}

module.exports = { 
    setEmployee,
    getOneEmployee,
    getEmployees,
    addNewEmployee,
    updateEmployee,
    removeEmployee,
    authAddEmployee
}