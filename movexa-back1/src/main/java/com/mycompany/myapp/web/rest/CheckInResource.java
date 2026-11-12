package com.mycompany.myapp.web.rest;

import com.mycompany.myapp.service.CheckInService;
import com.mycompany.myapp.service.dto.CheckInDtos.CheckInDTO;
import com.mycompany.myapp.service.dto.CheckInDtos.CheckInRequest;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

/** Pointage à l'entrée. */
@RestController
@RequestMapping("/api/check-ins")
public class CheckInResource {

    private final CheckInService checkInService;

    public CheckInResource(CheckInService checkInService) {
        this.checkInService = checkInService;
    }

    /** POST /api/check-ins : vérifie l'abonnement et enregistre le passage (réponse vert / orange / rouge). */
    @PostMapping("")
    @ResponseStatus(HttpStatus.CREATED)
    public CheckInDTO checkIn(@Valid @RequestBody CheckInRequest request) {
        return checkInService.checkIn(request);
    }

    /** GET /api/check-ins/today : passages du jour. */
    @GetMapping("/today")
    public List<CheckInDTO> today() {
        return checkInService.today();
    }
}
